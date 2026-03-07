package main

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
)

type LocalShare struct {
	Name string `json:"name"`
	Path string `json:"path"`
	As   string `json:"as"`
}

// ListLocalShares parses output of `tailscale drive list`
func ListLocalShares() ([]LocalShare, error) {
	out, err := exec.Command("tailscale", "drive", "list").Output()
	if err != nil {
		return nil, fmt.Errorf("tailscale drive list: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	var shares []LocalShare

	for _, line := range lines {
		// Skip header lines
		if strings.HasPrefix(line, "name") || strings.HasPrefix(line, "----") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) >= 3 {
			shares = append(shares, LocalShare{
				Name: fields[0],
				Path: fields[1],
				As:   fields[2],
			})
		}
	}

	if shares == nil {
		shares = []LocalShare{}
	}
	return shares, nil
}

// CreateLocalShare runs `tailscale drive share <name> <path>`
func CreateLocalShare(name, path string) error {
	out, err := exec.Command("tailscale", "drive", "share", name, path).CombinedOutput()
	if err != nil {
		return fmt.Errorf("tailscale drive share: %s: %w", string(out), err)
	}
	return nil
}

// RemoveLocalShare runs `tailscale drive unshare <name>`
func RemoveLocalShare(name string) error {
	out, err := exec.Command("tailscale", "drive", "unshare", name).CombinedOutput()
	if err != nil {
		return fmt.Errorf("tailscale drive unshare: %s: %w", string(out), err)
	}
	return nil
}

type TailscaleStatus struct {
	Self        string   `json:"self"`
	Domain      string   `json:"domain"`
	Online      bool     `json:"online"`
	Machines    []string `json:"machines"`
	DisplayName string   `json:"displayName"`
	LoginName   string   `json:"loginName"`
}

// GetTailscaleStatus returns parsed tailscale status
func GetTailscaleStatus() (*TailscaleStatus, error) {
	out, err := exec.Command("tailscale", "status", "--json").Output()
	if err != nil {
		return nil, fmt.Errorf("tailscale status: %w", err)
	}

	var raw map[string]any
	if err := json.Unmarshal(out, &raw); err != nil {
		return nil, err
	}

	status := &TailscaleStatus{Online: true}

	if self, ok := raw["Self"].(map[string]any); ok {
		if hn, ok := self["HostName"].(string); ok {
			status.Self = hn
		}
		// Extract user profile info
		if uid, ok := self["UserID"].(float64); ok {
			if users, ok := raw["User"].(map[string]any); ok {
				uidStr := fmt.Sprintf("%d", int64(uid))
				if user, ok := users[uidStr].(map[string]any); ok {
					if dn, ok := user["DisplayName"].(string); ok {
						status.DisplayName = dn
					}
					if ln, ok := user["LoginName"].(string); ok {
						status.LoginName = ln
					}
				}
			}
		}
	}
	if suffix, ok := raw["MagicDNSSuffix"].(string); ok {
		status.Domain = suffix
	}

	// Extract peer hostnames
	if peers, ok := raw["Peer"].(map[string]any); ok {
		for _, v := range peers {
			if peer, ok := v.(map[string]any); ok {
				if hn, ok := peer["HostName"].(string); ok {
					status.Machines = append(status.Machines, hn)
				}
			}
		}
	}

	return status, nil
}
