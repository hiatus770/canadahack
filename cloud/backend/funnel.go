package main

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type PublicShare struct {
	ID             string `json:"id"`
	Path           string `json:"path"`
	Label          string `json:"label"`
	PasswordHash   string `json:"passwordHash"`
	OneTime        bool   `json:"oneTime"`
	Active         bool   `json:"active"`
	CreatedAt      int64  `json:"createdAt"`
	LastHeartbeat  int64  `json:"lastHeartbeat"`
	SessionStarted bool   `json:"sessionStarted"`
}

type ShareStore struct {
	mu        sync.Mutex
	shares    map[string]*PublicShare
	file      string
	hmacKey   []byte
	handlers  *Handlers
}

func NewShareStore(file string, h *Handlers) *ShareStore {
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		log.Fatalf("failed to generate HMAC key: %v", err)
	}
	return &ShareStore{
		shares:   make(map[string]*PublicShare),
		file:     file,
		hmacKey:  key,
		handlers: h,
	}
}

func (s *ShareStore) Load() {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := os.ReadFile(s.file)
	if err != nil {
		return
	}
	var shares map[string]*PublicShare
	if err := json.Unmarshal(data, &shares); err != nil {
		log.Printf("Warning: could not parse %s: %v", s.file, err)
		return
	}
	s.shares = shares
}

func (s *ShareStore) save() error {
	data, err := json.Marshal(s.shares)
	if err != nil {
		return err
	}
	return os.WriteFile(s.file, data, 0644)
}

func (s *ShareStore) Create(path, label string, oneTime bool) (*PublicShare, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	id := generateID(16)
	password := generateID(12)

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", fmt.Errorf("bcrypt hash failed: %w", err)
	}

	share := &PublicShare{
		ID:           id,
		Path:         path,
		Label:        label,
		PasswordHash: string(hash),
		OneTime:      oneTime,
		Active:       true,
		CreatedAt:    time.Now().Unix(),
	}
	s.shares[id] = share

	if err := s.save(); err != nil {
		delete(s.shares, id)
		return nil, "", fmt.Errorf("save failed: %w", err)
	}

	go s.ensureFunnel()

	return share, password, nil
}

func (s *ShareStore) Get(id string) *PublicShare {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.shares[id]
}

func (s *ShareStore) List() []*PublicShare {
	s.mu.Lock()
	defer s.mu.Unlock()
	var result []*PublicShare
	for _, share := range s.shares {
		result = append(result, share)
	}
	return result
}

func (s *ShareStore) Deactivate(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	share, ok := s.shares[id]
	if !ok {
		return fmt.Errorf("share not found")
	}
	share.Active = !share.Active
	if err := s.save(); err != nil {
		return err
	}
	go s.ensureFunnel()
	return nil
}

func (s *ShareStore) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.shares[id]; !ok {
		return fmt.Errorf("share not found")
	}
	delete(s.shares, id)
	if err := s.save(); err != nil {
		return err
	}
	go s.ensureFunnel()
	return nil
}

func (s *ShareStore) ValidatePassword(id, password string) bool {
	s.mu.Lock()
	share, ok := s.shares[id]
	s.mu.Unlock()
	if !ok {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(share.PasswordHash), []byte(password)) == nil
}

func (s *ShareStore) Heartbeat(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if share, ok := s.shares[id]; ok {
		share.LastHeartbeat = time.Now().Unix()
		share.SessionStarted = true
		s.save()
	}
}

func (s *ShareStore) MarkClosed(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	share, ok := s.shares[id]
	if !ok {
		return
	}
	if share.OneTime && share.SessionStarted {
		share.Active = false
		s.save()
		go s.ensureFunnel()
	}
}

func (s *ShareStore) StartHeartbeatReaper() {
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			s.mu.Lock()
			now := time.Now().Unix()
			changed := false
			for _, share := range s.shares {
				if share.OneTime && share.Active && share.SessionStarted && share.LastHeartbeat > 0 && now-share.LastHeartbeat > 60 {
					share.Active = false
					changed = true
					log.Printf("Auto-deactivated one-time share %s (heartbeat timeout)", share.ID)
				}
			}
			if changed {
				s.save()
			}
			s.mu.Unlock()
			if changed {
				s.ensureFunnel()
			}
		}
	}()
}

// SignSession creates an HMAC-signed session token: id:expiry:signature
func (s *ShareStore) SignSession(shareID string) string {
	expiry := time.Now().Add(1 * time.Hour).Unix()
	payload := fmt.Sprintf("%s:%d", shareID, expiry)
	mac := hmac.New(sha256.New, s.hmacKey)
	mac.Write([]byte(payload))
	sig := hex.EncodeToString(mac.Sum(nil))
	return fmt.Sprintf("%s:%s", payload, sig)
}

// VerifySession checks that a session token is valid for the given share ID
func (s *ShareStore) VerifySession(shareID, token string) bool {
	// token format: shareID:expiry:signature
	parts := splitN(token, ":", 3)
	if len(parts) != 3 {
		return false
	}
	if parts[0] != shareID {
		return false
	}
	var expiry int64
	if _, err := fmt.Sscanf(parts[1], "%d", &expiry); err != nil {
		return false
	}
	if time.Now().Unix() > expiry {
		return false
	}
	payload := fmt.Sprintf("%s:%d", parts[0], expiry)
	mac := hmac.New(sha256.New, s.hmacKey)
	mac.Write([]byte(payload))
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(parts[2]))
}

func splitN(s, sep string, n int) []string {
	var result []string
	for i := 0; i < n-1; i++ {
		idx := indexOf(s, sep)
		if idx < 0 {
			break
		}
		result = append(result, s[:idx])
		s = s[idx+len(sep):]
	}
	result = append(result, s)
	return result
}

func indexOf(s, sub string) int {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

// runTailscale tries running a tailscale command directly, then retries with sudo on permission error.
func runTailscale(args ...string) error {
	out, err := exec.Command("tailscale", args...).CombinedOutput()
	if err == nil {
		return nil
	}
	outStr := string(out)
	// Retry with sudo if permission denied
	if strings.Contains(outStr, "Access denied") || strings.Contains(outStr, "permission denied") || strings.Contains(outStr, "not an admin") {
		log.Printf("tailscale %v failed without sudo, retrying with sudo", args)
		sudoArgs := append([]string{"tailscale"}, args...)
		out2, err2 := exec.Command("sudo", sudoArgs...).CombinedOutput()
		if err2 != nil {
			return fmt.Errorf("sudo tailscale %v failed: %v\n%s", args, err2, out2)
		}
		return nil
	}
	return fmt.Errorf("tailscale %v failed: %v\n%s", args, err, out)
}

func (s *ShareStore) ensureFunnel() {
	s.mu.Lock()
	activeCount := 0
	for _, share := range s.shares {
		if share.Active {
			activeCount++
		}
	}
	s.mu.Unlock()

	if activeCount > 0 {
		log.Printf("Enabling Tailscale Serve+Funnel for /s (active shares: %d)", activeCount)
		// Serve makes /s accessible within the tailnet
		if err := runTailscale("serve", "--bg", "--set-path=/s", "localhost:8081"); err != nil {
			log.Printf("Warning: serve /s: %v", err)
		}
		// Funnel makes /s accessible from the public internet
		if err := runTailscale("funnel", "--bg", "--set-path=/s", "localhost:8081"); err != nil {
			log.Printf("Warning: funnel /s: %v", err)
		}
	} else {
		log.Printf("Disabling Tailscale Serve+Funnel for /s (no active shares)")
		if err := runTailscale("funnel", "--bg", "--set-path=/s", "off"); err != nil {
			log.Printf("Warning: funnel off: %v", err)
		}
		if err := runTailscale("serve", "--bg", "--set-path=/s", "off"); err != nil {
			log.Printf("Warning: serve off: %v", err)
		}
	}
}

func EnsureTailscaleServe() {
	log.Printf("Enabling Tailscale Serve for localhost:5173")
	if err := runTailscale("serve", "--bg", "localhost:5173"); err != nil {
		log.Printf("Warning: %v", err)
	}
}

func generateID(length int) string {
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		log.Fatalf("failed to generate random ID: %v", err)
	}
	return hex.EncodeToString(b)[:length]
}
