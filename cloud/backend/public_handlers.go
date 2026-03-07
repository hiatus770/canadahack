package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

//go:embed templates/share.html
var templateFS embed.FS

var shareTmpl = template.Must(template.ParseFS(templateFS, "templates/share.html"))

type PublicHandlers struct {
	store    *ShareStore
	handlers *Handlers
}

// ── Rate limiting ────────────────────────────────────────────────────────────

type rateLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
}

var authLimiter = &rateLimiter{
	attempts: make(map[string][]time.Time),
}

func (rl *rateLimiter) allow(ip string, max int, window time.Duration) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-window)

	var recent []time.Time
	for _, t := range rl.attempts[ip] {
		if t.After(cutoff) {
			recent = append(recent, t)
		}
	}
	rl.attempts[ip] = recent

	if len(recent) >= max {
		return false
	}
	rl.attempts[ip] = append(rl.attempts[ip], now)
	return true
}

func getClientIP(r *http.Request) string {
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// ── Owner API (tailnet-only, under /api/) ────────────────────────────────────

// POST /api/public-shares — create a new public share link
func (ph *PublicHandlers) CreatePublicShare(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path    string `json:"path"`
		Label   string `json:"label"`
		OneTime bool   `json:"oneTime"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, "invalid request body", 400)
		return
	}
	if req.Path == "" {
		jsonErr(w, "path required", 400)
		return
	}
	if req.Label == "" {
		// Default label to the filename
		req.Label = filepath.Base(req.Path)
	}

	share, password, err := ph.store.Create(req.Path, req.Label, req.OneTime)
	if err != nil {
		jsonErr(w, fmt.Sprintf("create share failed: %v", err), 500)
		return
	}

	// Build the public URL using MagicDNSSuffix for the funnel domain
	var url string
	status, err2 := GetTailscaleStatus()
	if err2 == nil && status.Domain != "" {
		hostname, _ := os.Hostname()
		url = fmt.Sprintf("https://%s.%s/s/%s", hostname, status.Domain, share.ID)
	} else {
		url = fmt.Sprintf("/s/%s", share.ID)
	}

	jsonResp(w, map[string]any{
		"share":    share,
		"password": password,
		"url":      url,
	})
}

// GET /api/public-shares — list all public share links
func (ph *PublicHandlers) ListPublicShares(w http.ResponseWriter, r *http.Request) {
	shares := ph.store.List()
	if shares == nil {
		shares = []*PublicShare{}
	}
	jsonResp(w, shares)
}

// DELETE /api/public-shares/{id} — delete a public share link
func (ph *PublicHandlers) DeletePublicShare(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		jsonErr(w, "share id required", 400)
		return
	}
	if err := ph.store.Delete(id); err != nil {
		jsonErr(w, fmt.Sprintf("delete failed: %v", err), 404)
		return
	}
	jsonResp(w, map[string]string{"deleted": id})
}

// POST /api/public-shares/{id}/toggle — toggle active/inactive
func (ph *PublicHandlers) TogglePublicShare(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		jsonErr(w, "share id required", 400)
		return
	}
	if err := ph.store.Deactivate(id); err != nil {
		jsonErr(w, fmt.Sprintf("toggle failed: %v", err), 404)
		return
	}
	share := ph.store.Get(id)
	jsonResp(w, share)
}

// ── Public endpoints (Funneled, under /s/) ───────────────────────────────────

type sharePageData struct {
	ID            string
	Label         string
	Active        bool
	Authenticated bool
	OneTime       bool
	IsDir         bool
	FileName      string
	FileSize      string
	Error         string
}

// GET /s/{id} — render the share page
func (ph *PublicHandlers) RenderSharePage(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	share := ph.store.Get(id)
	if share == nil {
		http.NotFound(w, r)
		return
	}

	data := sharePageData{
		ID:      share.ID,
		Label:   share.Label,
		Active:  share.Active,
		OneTime: share.OneTime,
	}

	if !share.Active {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		shareTmpl.Execute(w, data)
		return
	}

	// Check for session cookie
	cookie, err := r.Cookie("share_session_" + id)
	if err == nil && ph.store.VerifySession(id, cookie.Value) {
		data.Authenticated = true
		data.IsDir = ph.isShareDir(share)
		if !data.IsDir {
			data.FileName = filepath.Base(share.Path)
			data.FileSize = ph.getFileSize(share)
		}
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	shareTmpl.Execute(w, data)
}

// POST /s/{id}/auth — verify password, set session cookie
func (ph *PublicHandlers) AuthShare(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	share := ph.store.Get(id)
	if share == nil {
		http.NotFound(w, r)
		return
	}

	if !share.Active {
		http.Redirect(w, r, shareBasePath(r, id), http.StatusSeeOther)
		return
	}

	// Rate limit
	ip := getClientIP(r)
	if !authLimiter.allow(ip, 5, time.Minute) {
		data := sharePageData{
			ID:     share.ID,
			Label:  share.Label,
			Active: true,
			Error:  "Too many attempts. Please wait a minute.",
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(429)
		shareTmpl.Execute(w, data)
		return
	}

	password := r.FormValue("password")
	if !ph.store.ValidatePassword(id, password) {
		data := sharePageData{
			ID:     share.ID,
			Label:  share.Label,
			Active: true,
			Error:  "Incorrect password. Please try again.",
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(401)
		shareTmpl.Execute(w, data)
		return
	}

	// Set session cookie
	base := shareBasePath(r, id)
	token := ph.store.SignSession(id)
	http.SetCookie(w, &http.Cookie{
		Name:     "share_session_" + id,
		Value:    token,
		Path:     base,
		MaxAge:   3600,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	http.Redirect(w, r, base, http.StatusSeeOther)
}

// GET /s/{id}/download — download the shared file
func (ph *PublicHandlers) DownloadShare(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	share := ph.store.Get(id)
	if share == nil || !share.Active {
		http.NotFound(w, r)
		return
	}

	if !ph.hasSession(r, id) {
		http.Redirect(w, r, shareBasePath(r, id), http.StatusSeeOther)
		return
	}

	// For folder shares, allow downloading specific files via ?file= param
	downloadPath := share.Path
	if ph.isShareDir(share) {
		fileName := r.URL.Query().Get("file")
		if fileName == "" {
			jsonErr(w, "file parameter required for folder shares", 400)
			return
		}
		// Prevent path traversal
		if strings.Contains(fileName, "/") || strings.Contains(fileName, "\\") || fileName == ".." {
			jsonErr(w, "invalid filename", 400)
			return
		}
		downloadPath = strings.TrimSuffix(share.Path, "/") + "/" + fileName
	}

	h := ph.handlers
	if h.isLocalPath(downloadPath) {
		shares, _ := ListLocalShares()
		fsPath := ResolveLocalPath(downloadPath, h.selfName, shares)
		if fsPath == "" {
			jsonErr(w, "file not found", 404)
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
	} else {
		reader, name, err := h.dav.Download(downloadPath)
		if err != nil {
			jsonErr(w, fmt.Sprintf("download failed: %v", err), 500)
			return
		}
		defer reader.Close()
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, name))
		w.Header().Set("Content-Type", "application/octet-stream")
		io.Copy(w, reader)
	}
}

// GET /s/{id}/files — list folder contents (folder shares only)
func (ph *PublicHandlers) ListShareFiles(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	share := ph.store.Get(id)
	if share == nil || !share.Active {
		http.NotFound(w, r)
		return
	}

	if !ph.hasSession(r, id) {
		jsonErr(w, "unauthorized", 401)
		return
	}

	if !ph.isShareDir(share) {
		jsonErr(w, "not a folder share", 400)
		return
	}

	h := ph.handlers
	if h.isLocalPath(share.Path) {
		entries, err := h.listLocalFiles(share.Path)
		if err != nil {
			jsonErr(w, fmt.Sprintf("failed to list: %v", err), 500)
			return
		}
		// Return simplified entries
		type SimpleEntry struct {
			Name  string `json:"name"`
			IsDir bool   `json:"isDir"`
			Size  int64  `json:"size"`
		}
		var simple []SimpleEntry
		for _, e := range entries {
			simple = append(simple, SimpleEntry{Name: e.Name, IsDir: e.IsDir, Size: e.Size})
		}
		if simple == nil {
			simple = []SimpleEntry{}
		}
		jsonResp(w, simple)
	} else {
		entries, err := h.dav.ListDir(share.Path)
		if err != nil {
			jsonErr(w, fmt.Sprintf("failed to list: %v", err), 500)
			return
		}
		type SimpleEntry struct {
			Name  string `json:"name"`
			IsDir bool   `json:"isDir"`
			Size  int64  `json:"size"`
		}
		var simple []SimpleEntry
		for _, e := range entries {
			simple = append(simple, SimpleEntry{Name: e.Name, IsDir: e.IsDir, Size: e.Size})
		}
		if simple == nil {
			simple = []SimpleEntry{}
		}
		jsonResp(w, simple)
	}
}

// POST /s/{id}/heartbeat — heartbeat ping (one-time links)
func (ph *PublicHandlers) HeartbeatShare(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	share := ph.store.Get(id)
	if share == nil {
		http.NotFound(w, r)
		return
	}

	if !ph.hasSession(r, id) {
		w.WriteHeader(401)
		return
	}

	closeParam := r.URL.Query().Get("close")
	if closeParam == "1" {
		ph.store.MarkClosed(id)
		log.Printf("Share %s: tab closed, marking for deactivation", id)
	} else {
		ph.store.Heartbeat(id)
	}

	w.WriteHeader(204)
}

// shareBasePath returns "/s/{id}" or "/{id}" depending on how the request arrived
// (tailscale --set-path=/s strips the /s prefix).
func shareBasePath(r *http.Request, id string) string {
	if strings.HasPrefix(r.URL.Path, "/s/") {
		return "/s/" + id
	}
	return "/" + id
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func (ph *PublicHandlers) hasSession(r *http.Request, shareID string) bool {
	cookie, err := r.Cookie("share_session_" + shareID)
	if err != nil {
		return false
	}
	return ph.store.VerifySession(shareID, cookie.Value)
}

func (ph *PublicHandlers) isShareDir(share *PublicShare) bool {
	h := ph.handlers
	if h.isLocalPath(share.Path) {
		shares, _ := ListLocalShares()
		fsPath := ResolveLocalPath(share.Path, h.selfName, shares)
		if fsPath == "" {
			return false
		}
		info, err := os.Stat(fsPath)
		if err != nil {
			return false
		}
		return info.IsDir()
	}
	// For remote paths, try listing — if it works, it's a directory
	entries, err := h.dav.ListDir(share.Path)
	return err == nil && entries != nil
}

func (ph *PublicHandlers) getFileSize(share *PublicShare) string {
	h := ph.handlers
	if h.isLocalPath(share.Path) {
		shares, _ := ListLocalShares()
		fsPath := ResolveLocalPath(share.Path, h.selfName, shares)
		if fsPath == "" {
			return ""
		}
		info, err := os.Stat(fsPath)
		if err != nil {
			return ""
		}
		return formatBytesGo(info.Size())
	}
	return ""
}

func formatBytesGo(bytes int64) string {
	if bytes == 0 {
		return "0 B"
	}
	sizes := []string{"B", "KB", "MB", "GB", "TB"}
	i := 0
	b := float64(bytes)
	for b >= 1024 && i < len(sizes)-1 {
		b /= 1024
		i++
	}
	if i == 0 {
		return fmt.Sprintf("%d B", bytes)
	}
	return fmt.Sprintf("%.1f %s", b, sizes[i])
}
