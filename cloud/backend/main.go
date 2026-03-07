package main

import (
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
)

const (
	davBase    = "http://100.100.100.100:8080"
	listenAddr = ":8081"
)

// Discover tailnet domain from tailscale status
func discoverDomain() string {
	out, err := exec.Command("tailscale", "status", "--json").Output()
	if err != nil {
		log.Printf("Warning: could not get tailscale status: %v", err)
		return ""
	}
	// Quick parse for MagicDNSSuffix
	s := string(out)
	idx := strings.Index(s, `"MagicDNSSuffix"`)
	if idx < 0 {
		return ""
	}
	rest := s[idx:]
	q1 := strings.Index(rest, `:"`) + 2
	q2 := strings.Index(rest[q1:], `"`)
	suffix := rest[q1 : q1+q2]
	// Domain is the suffix without trailing dot, converted:
	// tail1f78bd.ts.net -> need to get the actual org name from PROPFIND
	log.Printf("MagicDNSSuffix: %s", suffix)
	return suffix
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	dav := NewWebDAVClient(davBase)

	// Discover tailnet domain
	domain := dav.DiscoverDomain()
	if domain != "" {
		log.Printf("Tailnet domain: %s", domain)
	}

	mux := http.NewServeMux()

	// Discover self hostname
	selfName, _ := os.Hostname()
	log.Printf("Self hostname: %s", selfName)

	h := &Handlers{dav: dav, domain: domain, selfName: selfName}

	mux.HandleFunc("GET /api/machines", h.ListMachines)
	mux.HandleFunc("GET /api/files/all", h.ListAllFiles)
	mux.HandleFunc("GET /api/files", h.ListFiles)
	mux.HandleFunc("GET /api/download", h.Download)
	mux.HandleFunc("POST /api/upload", h.Upload)
	mux.HandleFunc("POST /api/mkdir", h.MkDir)
	mux.HandleFunc("DELETE /api/files", h.DeleteFile)
	mux.HandleFunc("POST /api/rename", h.Rename)
	mux.HandleFunc("GET /api/shares", h.ListShares)
	mux.HandleFunc("POST /api/shares", h.CreateShare)
	mux.HandleFunc("DELETE /api/shares/{name}", h.RemoveShare)
	mux.HandleFunc("GET /api/status", h.Status)
	mux.HandleFunc("GET /api/storage", h.Storage)
	mux.HandleFunc("GET /api/preview", h.Preview)
	mux.HandleFunc("GET /api/whoami", h.WhoAmI)
	mux.HandleFunc("GET /api/comments", h.GetComments)
	mux.HandleFunc("POST /api/comments", h.AddComment)

	log.Printf("TailCloud backend listening on %s", listenAddr)
	log.Fatal(http.ListenAndServe(listenAddr, cors(mux)))
}
