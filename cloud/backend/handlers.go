package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
)

type Handlers struct {
	dav      *WebDAVClient
	domain   string
	selfName string
}

// isLocalPath checks if a path refers to the local machine
func (h *Handlers) isLocalPath(p string) bool {
	parts := strings.SplitN(strings.TrimPrefix(p, "/"), "/", 2)
	return len(parts) > 0 && parts[0] == h.selfName
}

func jsonResp(w http.ResponseWriter, data any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func jsonErr(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// GET /api/machines — list all machines with their shares
func (h *Handlers) ListMachines(w http.ResponseWriter, r *http.Request) {
	machines, err := h.dav.ListMachines()
	if err != nil {
		jsonErr(w, fmt.Sprintf("failed to list machines: %v", err), 500)
		return
	}

	type MachineInfo struct {
		Name   string   `json:"name"`
		Shares []string `json:"shares"`
		IsSelf bool     `json:"isSelf"`
	}

	// Add local machine first with its shares
	localShares, _ := ListLocalShares()
	localShareNames := make([]string, len(localShares))
	for i, s := range localShares {
		localShareNames[i] = s.Name
	}
	result := []MachineInfo{{Name: h.selfName, Shares: localShareNames, IsSelf: true}}

	// Fetch shares concurrently so slow/offline machines don't block
	type machResult struct {
		info MachineInfo
		idx  int
	}
	ch := make(chan machResult, len(machines))
	for i, m := range machines {
		go func(idx int, name string) {
			shares, err := h.dav.ListShares(name)
			if err != nil {
				log.Printf("Error listing shares for %s: %v", name, err)
				shares = []string{}
			}
			if shares == nil {
				shares = []string{}
			}
			ch <- machResult{MachineInfo{Name: name, Shares: shares, IsSelf: false}, idx}
		}(i, m)
	}
	remotes := make([]MachineInfo, len(machines))
	for range machines {
		r := <-ch
		remotes[r.idx] = r.info
	}
	result = append(result, remotes...)
	jsonResp(w, result)
}

// GET /api/files?path=/machine/share/... — list files at path
func (h *Handlers) ListFiles(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Query().Get("path")
	if p == "" {
		jsonErr(w, "path parameter required", 400)
		return
	}

	// Check if this is a local path (self machine)
	if h.isLocalPath(p) {
		entries, err := h.listLocalFiles(p)
		if err != nil {
			jsonErr(w, fmt.Sprintf("failed to list local: %v", err), 500)
			return
		}
		jsonResp(w, entries)
		return
	}

	entries, err := h.dav.ListDir(p)
	if err != nil {
		jsonErr(w, fmt.Sprintf("failed to list: %v", err), 500)
		return
	}
	if entries == nil {
		entries = []FileEntry{}
	}
	jsonResp(w, entries)
}

// listLocalFiles lists files from local shares given a virtual path
func (h *Handlers) listLocalFiles(virtualPath string) ([]FileEntry, error) {
	parts := strings.SplitN(strings.TrimPrefix(virtualPath, "/"), "/", 3)
	machine := parts[0]

	// If only machine name, list its shares as folders
	if len(parts) == 1 {
		localShares, err := ListLocalShares()
		if err != nil {
			return nil, err
		}
		var entries []FileEntry
		for _, s := range localShares {
			entries = append(entries, FileEntry{
				Name:    s.Name,
				Path:    "/" + machine + "/" + s.Name,
				IsDir:   true,
				Kind:    "folder",
				Machine: machine,
			})
		}
		if entries == nil {
			entries = []FileEntry{}
		}
		return entries, nil
	}

	shareName := parts[1]
	relPath := ""
	if len(parts) == 3 {
		relPath = parts[2]
	}

	// Find the share path
	localShares, err := ListLocalShares()
	if err != nil {
		return nil, err
	}
	for _, s := range localShares {
		if s.Name == shareName {
			entries, err := ListLocalDir(s.Path, relPath, machine, shareName)
			if err != nil {
				return nil, err
			}
			if entries == nil {
				entries = []FileEntry{}
			}
			return entries, nil
		}
	}
	return []FileEntry{}, nil
}

// GET /api/files/all — aggregated files from all machines
func (h *Handlers) ListAllFiles(w http.ResponseWriter, r *http.Request) {
	var all []FileEntry

	// Include local shares first
	localShares, _ := ListLocalShares()
	for _, s := range localShares {
		entries, err := ListLocalDir(s.Path, "", h.selfName, s.Name)
		if err != nil {
			log.Printf("Error listing local share %s: %v", s.Name, err)
			continue
		}
		all = append(all, entries...)
	}

	// Include remote machines via WebDAV
	machines, err := h.dav.ListMachines()
	if err != nil {
		log.Printf("Error listing remote machines: %v", err)
	} else {
		for _, m := range machines {
			shares, err := h.dav.ListShares(m)
			if err != nil {
				continue
			}
			for _, s := range shares {
				entries, err := h.dav.ListDir("/" + m + "/" + s)
				if err != nil {
					log.Printf("Error listing %s/%s: %v", m, s, err)
					continue
				}
				for i := range entries {
					entries[i].Machine = m
				}
				all = append(all, entries...)
			}
		}
	}

	if all == nil {
		all = []FileEntry{}
	}
	jsonResp(w, all)
}

// GET /api/download?path=... — download a file
func (h *Handlers) Download(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Query().Get("path")
	if p == "" {
		jsonErr(w, "path parameter required", 400)
		return
	}

	// Local file?
	if h.isLocalPath(p) {
		shares, _ := ListLocalShares()
		fsPath := ResolveLocalPath(p, h.selfName, shares)
		if fsPath == "" {
			jsonErr(w, "share not found", 404)
			return
		}
		reader, name, err := OpenLocalFile(fsPath)
		if err != nil {
			jsonErr(w, fmt.Sprintf("download failed: %v", err), 500)
			return
		}
		defer reader.Close()
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, name))
		w.Header().Set("Content-Type", "application/octet-stream")
		io.Copy(w, reader)
		return
	}

	reader, name, err := h.dav.Download(p)
	if err != nil {
		jsonErr(w, fmt.Sprintf("download failed: %v", err), 500)
		return
	}
	defer reader.Close()

	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, name))
	w.Header().Set("Content-Type", "application/octet-stream")
	io.Copy(w, reader)
}

// POST /api/upload?path=... — upload file(s) via multipart form
func (h *Handlers) Upload(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Query().Get("path")
	if p == "" {
		jsonErr(w, "path parameter required", 400)
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		jsonErr(w, fmt.Sprintf("parse form failed: %v", err), 400)
		return
	}

	files := r.MultipartForm.File["file"]
	if len(files) == 0 {
		jsonErr(w, "no files provided", 400)
		return
	}

	var uploaded []string
	for _, fh := range files {
		f, err := fh.Open()
		if err != nil {
			jsonErr(w, fmt.Sprintf("open file failed: %v", err), 500)
			return
		}

		destPath := strings.TrimSuffix(p, "/") + "/" + fh.Filename

		if h.isLocalPath(destPath) {
			shares, _ := ListLocalShares()
			fsPath := ResolveLocalPath(destPath, h.selfName, shares)
			if fsPath == "" {
				f.Close()
				jsonErr(w, "share not found", 404)
				return
			}
			if err := WriteLocalFile(fsPath, f); err != nil {
				f.Close()
				jsonErr(w, fmt.Sprintf("upload failed: %v", err), 500)
				return
			}
		} else {
			if err := h.dav.Upload(destPath, f, fh.Size); err != nil {
				f.Close()
				jsonErr(w, fmt.Sprintf("upload failed: %v", err), 500)
				return
			}
		}
		f.Close()
		uploaded = append(uploaded, fh.Filename)
	}

	jsonResp(w, map[string]any{"uploaded": uploaded})
}

// POST /api/mkdir?path=... — create directory
// Detects share-level creation on local machine and auto-creates a Tailscale share
func (h *Handlers) MkDir(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Query().Get("path")
	if p == "" {
		jsonErr(w, "path parameter required", 400)
		return
	}

	parts := strings.SplitN(strings.TrimPrefix(p, "/"), "/", 3)
	machine := parts[0]
	isShareLevel := len(parts) == 2 // /machine/name — no deeper path

	if h.isLocalPath(p) {
		if isShareLevel {
			// Creating at share level on local machine — auto-create a Tailscale share
			shareName := parts[1]

			// Create directory at ~/Shares/<name>
			homeDir, err := os.UserHomeDir()
			if err != nil {
				jsonErr(w, fmt.Sprintf("cannot find home dir: %v", err), 500)
				return
			}
			sharePath := filepath.Join(homeDir, "Shares", shareName)
			if err := os.MkdirAll(sharePath, 0755); err != nil {
				jsonErr(w, fmt.Sprintf("mkdir failed: %v", err), 500)
				return
			}

			// Register as a Tailscale drive share
			if err := CreateLocalShare(shareName, sharePath); err != nil {
				jsonErr(w, fmt.Sprintf("create share failed: %v", err), 500)
				return
			}
			log.Printf("Auto-created share %q at %s", shareName, sharePath)
			jsonResp(w, map[string]string{"created": p, "share": shareName, "path": sharePath})
			return
		}

		shares, _ := ListLocalShares()
		fsPath := ResolveLocalPath(p, h.selfName, shares)
		if fsPath == "" {
			jsonErr(w, "share not found", 404)
			return
		}
		if err := MkLocalDir(fsPath); err != nil {
			jsonErr(w, fmt.Sprintf("mkdir failed: %v", err), 500)
			return
		}
	} else {
		if isShareLevel {
			jsonErr(w, fmt.Sprintf("cannot create shares on remote machine %q — only the machine owner can do that", machine), 400)
			return
		}
		if err := h.dav.MkDir(p); err != nil {
			jsonErr(w, fmt.Sprintf("mkdir failed: %v", err), 500)
			return
		}
	}
	jsonResp(w, map[string]string{"created": p})
}

// DELETE /api/files?path=... — delete file or folder
func (h *Handlers) DeleteFile(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Query().Get("path")
	if p == "" {
		jsonErr(w, "path parameter required", 400)
		return
	}

	if h.isLocalPath(p) {
		shares, _ := ListLocalShares()
		fsPath := ResolveLocalPath(p, h.selfName, shares)
		if fsPath == "" {
			jsonErr(w, "share not found", 404)
			return
		}
		if err := DeleteLocal(fsPath); err != nil {
			jsonErr(w, fmt.Sprintf("delete failed: %v", err), 500)
			return
		}
	} else {
		if err := h.dav.Delete(p); err != nil {
			jsonErr(w, fmt.Sprintf("delete failed: %v", err), 500)
			return
		}
	}
	jsonResp(w, map[string]string{"deleted": p})
}

// POST /api/rename — rename/move file or folder
func (h *Handlers) Rename(w http.ResponseWriter, r *http.Request) {
	var req struct {
		OldPath string `json:"oldPath"`
		NewPath string `json:"newPath"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, "invalid request body", 400)
		return
	}

	if err := h.dav.Move(req.OldPath, req.NewPath); err != nil {
		jsonErr(w, fmt.Sprintf("rename failed: %v", err), 500)
		return
	}
	jsonResp(w, map[string]string{"renamed": req.OldPath, "to": req.NewPath})
}

// GET /api/shares — list local shares
func (h *Handlers) ListShares(w http.ResponseWriter, r *http.Request) {
	shares, err := ListLocalShares()
	if err != nil {
		jsonErr(w, fmt.Sprintf("list shares failed: %v", err), 500)
		return
	}
	jsonResp(w, shares)
}

// POST /api/shares — create a local share
func (h *Handlers) CreateShare(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
		Path string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, "invalid request body", 400)
		return
	}
	if req.Name == "" || req.Path == "" {
		jsonErr(w, "name and path required", 400)
		return
	}

	if err := CreateLocalShare(req.Name, req.Path); err != nil {
		jsonErr(w, fmt.Sprintf("create share failed: %v", err), 500)
		return
	}
	jsonResp(w, map[string]string{"created": req.Name})
}

// DELETE /api/shares/{name} — remove a local share
func (h *Handlers) RemoveShare(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if name == "" {
		jsonErr(w, "share name required", 400)
		return
	}

	if err := RemoveLocalShare(name); err != nil {
		jsonErr(w, fmt.Sprintf("remove share failed: %v", err), 500)
		return
	}
	jsonResp(w, map[string]string{"removed": name})
}

// GET /api/status — tailscale status
func (h *Handlers) Status(w http.ResponseWriter, r *http.Request) {
	status, err := GetTailscaleStatus()
	if err != nil {
		jsonErr(w, fmt.Sprintf("status failed: %v", err), 500)
		return
	}
	jsonResp(w, status)
}

// GET /api/storage — disk usage for local machine
func (h *Handlers) Storage(w http.ResponseWriter, r *http.Request) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs("/", &stat); err != nil {
		jsonErr(w, fmt.Sprintf("statfs failed: %v", err), 500)
		return
	}
	total := stat.Blocks * uint64(stat.Bsize)
	avail := stat.Bavail * uint64(stat.Bsize)
	used := total - (stat.Bfree * uint64(stat.Bsize))
	// Match df: percent = used / (used + available)
	usable := used + avail
	percent := float64(used) / float64(usable) * 100

	jsonResp(w, map[string]any{
		"used":    used,
		"total":   total,
		"percent": percent,
	})
}

// GET /api/preview?path=... — preview file content (text files: first 100KB)
func (h *Handlers) Preview(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Query().Get("path")
	if p == "" {
		jsonErr(w, "path parameter required", 400)
		return
	}

	// Determine if text-previewable based on extension
	ext := strings.ToLower(filepath.Ext(p))
	textExts := map[string]bool{
		".txt": true, ".md": true, ".json": true, ".yaml": true, ".yml": true,
		".toml": true, ".ini": true, ".conf": true, ".cfg": true, ".env": true,
		".sh": true, ".py": true, ".go": true, ".js": true, ".ts": true,
		".rb": true, ".pl": true, ".csv": true, ".tsv": true, ".log": true,
		".xml": true, ".html": true, ".css": true, ".sql": true, ".acl": true,
		".jsx": true, ".tsx": true, ".rs": true, ".c": true, ".h": true,
		".cpp": true, ".java": true, ".kt": true, ".swift": true,
	}

	if !textExts[ext] {
		jsonResp(w, map[string]any{"type": "binary", "content": ""})
		return
	}

	// Read file content
	var content string
	if h.isLocalPath(p) {
		shares, _ := ListLocalShares()
		fsPath := ResolveLocalPath(p, h.selfName, shares)
		if fsPath == "" {
			jsonErr(w, "share not found", 404)
			return
		}
		reader, _, err := OpenLocalFile(fsPath)
		if err != nil {
			jsonErr(w, fmt.Sprintf("preview failed: %v", err), 500)
			return
		}
		defer reader.Close()
		data, err := io.ReadAll(io.LimitReader(reader, 100*1024))
		if err != nil {
			jsonErr(w, fmt.Sprintf("read failed: %v", err), 500)
			return
		}
		content = string(data)
	} else {
		reader, _, err := h.dav.Download(p)
		if err != nil {
			jsonErr(w, fmt.Sprintf("preview failed: %v", err), 500)
			return
		}
		defer reader.Close()
		data, err := io.ReadAll(io.LimitReader(reader, 100*1024))
		if err != nil {
			jsonErr(w, fmt.Sprintf("read failed: %v", err), 500)
			return
		}
		content = string(data)
	}

	jsonResp(w, map[string]any{"type": "text", "content": content})
}

// GET /api/whoami — identify the connecting Tailscale user by their IP
func (h *Handlers) WhoAmI(w http.ResponseWriter, r *http.Request) {
	// Tailscale Serve sets identity headers — use them first (most reliable
	// since Serve strips spoofed values and the proxy chain loses the real IP)
	tsLogin := r.Header.Get("Tailscale-User-Login")
	tsName := r.Header.Get("Tailscale-User-Name")
	if tsLogin != "" {
		log.Printf("[whoami] using Tailscale-User headers: login=%q name=%q", tsLogin, tsName)
		jsonResp(w, map[string]any{
			"displayName": tsName,
			"loginName":   tsLogin,
			"tailscaleIP": r.RemoteAddr,
		})
		return
	}

	// Fall back to IP-based whois for direct connections (not through Serve)
	clientIP := r.Header.Get("X-Forwarded-For")
	if clientIP != "" {
		clientIP = strings.TrimSpace(strings.Split(clientIP, ",")[0])
	} else {
		clientIP = r.RemoteAddr
	}
	log.Printf("[whoami] no TS headers, trying whois: XFF=%q RemoteAddr=%q", r.Header.Get("X-Forwarded-For"), r.RemoteAddr)
	if host, _, err := net.SplitHostPort(clientIP); err == nil {
		clientIP = host
	}
	clientIP = strings.TrimPrefix(clientIP, "::ffff:")

	out, err := exec.Command("tailscale", "whois", "--json", clientIP).Output()
	if err != nil {
		log.Printf("[whoami] whois failed for %s: %v — falling back to self", clientIP, err)
		status, err2 := GetTailscaleStatus()
		if err2 != nil {
			jsonErr(w, fmt.Sprintf("whoami failed: %v", err), 500)
			return
		}
		jsonResp(w, map[string]any{
			"displayName": status.DisplayName,
			"loginName":   status.LoginName,
			"hostname":    status.Self,
			"tailscaleIP": clientIP,
		})
		return
	}

	var raw map[string]any
	if err := json.Unmarshal(out, &raw); err != nil {
		jsonErr(w, fmt.Sprintf("parse whois failed: %v", err), 500)
		return
	}

	result := map[string]any{
		"tailscaleIP": clientIP,
	}

	if node, ok := raw["Node"].(map[string]any); ok {
		if hn, ok := node["Hostinfo"].(map[string]any); ok {
			if hostname, ok := hn["Hostname"].(string); ok {
				result["hostname"] = hostname
			}
		}
	}

	if up, ok := raw["UserProfile"].(map[string]any); ok {
		if dn, ok := up["DisplayName"].(string); ok {
			result["displayName"] = dn
		}
		if ln, ok := up["LoginName"].(string); ok {
			result["loginName"] = ln
		}
	}

	jsonResp(w, result)
}

// ── Comments (server-side, shared across users) ─────────────────────────────

type Comment struct {
	ID        int64  `json:"id"`
	Text      string `json:"text"`
	Author    string `json:"author"`
	Timestamp int64  `json:"timestamp"`
}

var (
	commentsMu   sync.Mutex
	commentsFile = "comments.json"
)

func loadAllComments() map[string][]Comment {
	data, err := os.ReadFile(commentsFile)
	if err != nil {
		return map[string][]Comment{}
	}
	var m map[string][]Comment
	if err := json.Unmarshal(data, &m); err != nil {
		return map[string][]Comment{}
	}
	return m
}

func saveAllComments(m map[string][]Comment) error {
	data, err := json.Marshal(m)
	if err != nil {
		return err
	}
	return os.WriteFile(commentsFile, data, 0644)
}

// GET /api/comments?path=... — get comments for a file
func (h *Handlers) GetComments(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Query().Get("path")
	if p == "" {
		jsonErr(w, "path parameter required", 400)
		return
	}
	commentsMu.Lock()
	all := loadAllComments()
	commentsMu.Unlock()
	comments := all[p]
	if comments == nil {
		comments = []Comment{}
	}
	jsonResp(w, comments)
}

// POST /api/comments?path=... — add a comment to a file
func (h *Handlers) AddComment(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Query().Get("path")
	if p == "" {
		jsonErr(w, "path parameter required", 400)
		return
	}

	var req struct {
		Text   string `json:"text"`
		Author string `json:"author"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, "invalid request body", 400)
		return
	}
	if req.Text == "" {
		jsonErr(w, "text required", 400)
		return
	}

	comment := Comment{
		ID:        time.Now().UnixMilli(),
		Text:      req.Text,
		Author:    req.Author,
		Timestamp: time.Now().UnixMilli(),
	}

	commentsMu.Lock()
	all := loadAllComments()
	all[p] = append([]Comment{comment}, all[p]...)
	err := saveAllComments(all)
	commentsMu.Unlock()

	if err != nil {
		jsonErr(w, fmt.Sprintf("save failed: %v", err), 500)
		return
	}
	jsonResp(w, comment)
}
