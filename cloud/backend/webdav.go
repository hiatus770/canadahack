package main

import (
	"io"
	"log"
	"os"
	"path"
	"strings"

	"github.com/studio-b12/gowebdav"
)

type WebDAVClient struct {
	baseURL string
	client  *gowebdav.Client
	domain  string // e.g. "hiatus770.github"
}

type FileEntry struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	IsDir    bool   `json:"isDir"`
	Size     int64  `json:"size"`
	Modified string `json:"modified"`
	Kind     string `json:"kind"`
	Machine  string `json:"machine,omitempty"`
}

func NewWebDAVClient(baseURL string) *WebDAVClient {
	c := gowebdav.NewClient(baseURL, "", "")
	return &WebDAVClient{
		baseURL: baseURL,
		client:  c,
	}
}

// DiscoverDomain does a PROPFIND on root to find the tailnet domain directory
func (w *WebDAVClient) DiscoverDomain() string {
	files, err := w.client.ReadDir("/")
	if err != nil {
		log.Printf("Error discovering domain: %v", err)
		return ""
	}
	for _, f := range files {
		if f.IsDir() {
			w.domain = f.Name()
			return w.domain
		}
	}
	return ""
}

// ListMachines returns all machine directories under the tailnet domain
func (w *WebDAVClient) ListMachines() ([]string, error) {
	if w.domain == "" {
		w.DiscoverDomain()
	}
	files, err := w.client.ReadDir("/" + w.domain + "/")
	if err != nil {
		return nil, err
	}
	var machines []string
	for _, f := range files {
		if f.IsDir() {
			machines = append(machines, f.Name())
		}
	}
	return machines, nil
}

// ListShares returns share directories for a given machine
func (w *WebDAVClient) ListShares(machine string) ([]string, error) {
	p := "/" + w.domain + "/" + machine + "/"
	files, err := w.client.ReadDir(p)
	if err != nil {
		return nil, err
	}
	var shares []string
	for _, f := range files {
		if f.IsDir() {
			shares = append(shares, f.Name())
		}
	}
	return shares, nil
}

// ListDir lists files and folders at the given relative path (under domain)
// path should be like "/machine/share/folder"
func (w *WebDAVClient) ListDir(relPath string) ([]FileEntry, error) {
	fullPath := "/" + w.domain + relPath
	if !strings.HasSuffix(fullPath, "/") {
		fullPath += "/"
	}

	files, err := w.client.ReadDir(fullPath)
	if err != nil {
		return nil, err
	}

	var entries []FileEntry
	for _, f := range files {
		entry := FileEntry{
			Name:     f.Name(),
			Path:     relPath + "/" + f.Name(),
			IsDir:    f.IsDir(),
			Size:     f.Size(),
			Modified: f.ModTime().UTC().Format("2006-01-02T15:04:05Z"),
			Kind:     inferKind(f.Name(), f.IsDir()),
		}
		// Extract machine name from path
		parts := strings.SplitN(strings.TrimPrefix(relPath, "/"), "/", 2)
		if len(parts) > 0 {
			entry.Machine = parts[0]
		}
		entries = append(entries, entry)
	}
	return entries, nil
}

// Download streams a file to the writer
func (w *WebDAVClient) Download(relPath string) (io.ReadCloser, string, error) {
	fullPath := "/" + w.domain + relPath
	reader, err := w.client.ReadStream(fullPath)
	if err != nil {
		return nil, "", err
	}
	name := path.Base(relPath)
	return reader, name, nil
}

// Upload writes data from reader to the given path
func (w *WebDAVClient) Upload(relPath string, reader io.Reader, size int64) error {
	fullPath := "/" + w.domain + relPath

	// Read into temp file first since gowebdav needs ReadCloser or bytes
	tmp, err := os.CreateTemp("", "upload-*")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	defer tmp.Close()

	if _, err := io.Copy(tmp, reader); err != nil {
		return err
	}
	tmp.Seek(0, 0)

	return w.client.WriteStream(fullPath, tmp, 0644)
}

// MkDir creates a directory at the given path
func (w *WebDAVClient) MkDir(relPath string) error {
	fullPath := "/" + w.domain + relPath
	return w.client.Mkdir(fullPath, 0755)
}

// Delete removes a file or directory
func (w *WebDAVClient) Delete(relPath string) error {
	fullPath := "/" + w.domain + relPath
	return w.client.Remove(fullPath)
}

// Move renames/moves a resource
func (w *WebDAVClient) Move(oldPath, newPath string) error {
	src := "/" + w.domain + oldPath
	dst := "/" + w.domain + newPath
	return w.client.Rename(src, dst, true)
}

// inferKind guesses the file type from its extension
func inferKind(name string, isDir bool) string {
	if isDir {
		return "folder"
	}
	ext := strings.ToLower(path.Ext(name))
	switch ext {
	case ".sh", ".py", ".go", ".js", ".ts", ".rb", ".pl":
		return "script"
	case ".json", ".yaml", ".yml", ".toml", ".ini", ".conf", ".cfg", ".env":
		return "config"
	case ".csv", ".xlsx", ".xls", ".tsv":
		return "spreadsheet"
	case ".pptx", ".ppt", ".key":
		return "presentation"
	case ".tar", ".gz", ".zip", ".bak", ".tar.gz", ".tgz", ".rar", ".7z":
		return "backup"
	case ".log":
		return "log"
	case ".pdf", ".doc", ".docx", ".md", ".txt", ".rtf":
		return "document"
	case ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp":
		return "image"
	case ".mp4", ".mov", ".avi", ".mkv", ".webm":
		return "video"
	case ".mp3", ".wav", ".flac", ".ogg", ".aac":
		return "audio"
	default:
		return "document"
	}
}
