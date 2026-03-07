package main

import (
	"io"
	"os"
	"path/filepath"
	"strings"
)

// ListLocalDir reads a local share directory and returns FileEntry items.
// sharePath is the local filesystem path of the share root.
// relPath is the relative path within the share (can be empty for root).
// machine is the hostname to tag entries with.
// shareName is the share name for building the virtual path.
func ListLocalDir(sharePath, relPath, machine, shareName string) ([]FileEntry, error) {
	fullPath := filepath.Join(sharePath, relPath)
	dirEntries, err := os.ReadDir(fullPath)
	if err != nil {
		return nil, err
	}

	var entries []FileEntry
	for _, de := range dirEntries {
		// Skip hidden files
		if strings.HasPrefix(de.Name(), ".") {
			continue
		}
		info, err := de.Info()
		if err != nil {
			continue
		}

		virtualPath := "/" + machine + "/" + shareName
		if relPath != "" {
			virtualPath += "/" + relPath
		}
		virtualPath += "/" + de.Name()

		entries = append(entries, FileEntry{
			Name:     de.Name(),
			Path:     virtualPath,
			IsDir:    de.IsDir(),
			Size:     info.Size(),
			Modified: info.ModTime().UTC().Format("2006-01-02T15:04:05Z"),
			Kind:     inferKind(de.Name(), de.IsDir()),
			Machine:  machine,
		})
	}
	return entries, nil
}

// ResolveLocalPath takes a virtual path like /insp/test/docs/file.txt
// and resolves it to a real local filesystem path, given the local shares.
// Returns the resolved filesystem path, or empty string if not a local share.
func ResolveLocalPath(virtualPath string, selfName string, shares []LocalShare) string {
	parts := strings.SplitN(strings.TrimPrefix(virtualPath, "/"), "/", 3)
	if len(parts) < 2 {
		return ""
	}
	machine := parts[0]
	shareName := parts[1]
	rest := ""
	if len(parts) == 3 {
		rest = parts[2]
	}

	if machine != selfName {
		return ""
	}

	for _, s := range shares {
		if s.Name == shareName {
			return filepath.Join(s.Path, rest)
		}
	}
	return ""
}

// OpenLocalFile opens a local file for reading
func OpenLocalFile(fsPath string) (io.ReadCloser, string, error) {
	f, err := os.Open(fsPath)
	if err != nil {
		return nil, "", err
	}
	return f, filepath.Base(fsPath), nil
}

// WriteLocalFile writes data to a local file
func WriteLocalFile(fsPath string, r io.Reader) error {
	dir := filepath.Dir(fsPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	f, err := os.Create(fsPath)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, r)
	return err
}

// MkLocalDir creates a local directory
func MkLocalDir(fsPath string) error {
	return os.MkdirAll(fsPath, 0755)
}

// DeleteLocal removes a local file or directory
func DeleteLocal(fsPath string) error {
	return os.RemoveAll(fsPath)
}
