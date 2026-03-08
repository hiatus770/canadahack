#!/usr/bin/env python3
"""CanadaHack Services — System Tray Daemon

Manages all 5 project services from a single tray icon.
Uses GTK3 + AyatanaAppIndicator3 for the tray menu.
"""

import json
import os
import signal
import socket
import subprocess
import sys
import time

import gi
gi.require_version("Gtk", "3.0")
gi.require_version("AyatanaAppIndicator3", "0.1")
from gi.repository import AyatanaAppIndicator3 as AppIndicator
from gi.repository import GLib, Gtk

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SERVICE_DEFS = [
    {
        "name": "TailCloud Backend",
        "port": 8081,
        "cwd": os.path.join(PROJECT_ROOT, "cloud", "backend"),
        "build_cmd": ["go", "build", "-o", "tailcloud-backend", "."],
        "run_cmd": ["./tailcloud-backend"],
        "pkill_pattern": "tailcloud-backend",
        "log": "/tmp/tailcloud-backend.log",
        "tailscale_serve": None,  # handled by the Go binary itself
    },
    {
        "name": "TailCloud Frontend",
        "port": 5173,
        "cwd": os.path.join(PROJECT_ROOT, "cloud", "frontend"),
        "build_cmd": None,
        "run_cmd": ["npx", "vite", "--host", "0.0.0.0"],
        "pkill_pattern": "node.*vite.*cloud",
        "log": "/tmp/tailcloud-frontend.log",
        "tailscale_serve": None,  # handled by EnsureTailscaleServe() in Go
    },
    {
        "name": "TailTV Backend",
        "port": 8000,
        "cwd": os.path.join(PROJECT_ROOT, "tv", "backend"),
        "build_cmd": None,
        "run_cmd": [
            os.path.join(PROJECT_ROOT, "tv", "backend", "venv", "bin", "python"),
            "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000",
        ],
        "pkill_pattern": "uvicorn main:app.*8000",
        "log": "/tmp/tailtv-backend.log",
        "tailscale_serve": None,
    },
    {
        "name": "TailTV Frontend",
        "port": 5174,
        "cwd": os.path.join(PROJECT_ROOT, "tv", "frontend"),
        "build_cmd": None,
        "run_cmd": ["npx", "vite", "--host", "0.0.0.0"],
        "pkill_pattern": "node.*vite.*tv",
        "log": "/tmp/tailtv-frontend.log",
        "tailscale_serve": {"path": "/tv", "target": "localhost:5174"},
    },
    {
        "name": "Camera Observer",
        "port": 8554,
        "cwd": os.path.join(PROJECT_ROOT, "cam"),
        "build_cmd": None,
        "run_cmd": [
            os.path.join(PROJECT_ROOT, "cam", "venv", "bin", "python"),
            "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8554",
        ],
        "pkill_pattern": "uvicorn main:app.*8554",
        "log": "/tmp/tailcam.log",
        "tailscale_serve": None,
        "env_extra": {
            "TAILTV_BACKEND_URL": "http://localhost:8000",
            "CAM_NAME": "Default Camera",
            "CAM_LOCATION": "Unassigned",
        },
    },
]

HEALTH_INTERVAL = 5  # seconds


def notify(summary, body=""):
    try:
        subprocess.Popen(
            ["notify-send", "-a", "CanadaHack", summary, body],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        pass


def port_open(port):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            s.connect(("127.0.0.1", port))
            return True
    except (ConnectionRefusedError, OSError):
        return False


def get_tailnet_domain():
    try:
        out = subprocess.check_output(
            ["tailscale", "status", "--json"],
            stderr=subprocess.DEVNULL, timeout=5,
        )
        data = json.loads(out)
        dns_name = data.get("Self", {}).get("DNSName", "")
        # DNSName looks like "hostname.tailnet-name.ts.net."
        if dns_name.endswith("."):
            dns_name = dns_name[:-1]
        return dns_name
    except Exception:
        return None


class ServiceManager:
    def __init__(self):
        self.procs = {}  # port -> Popen
        self.prev_status = {}  # port -> bool

    def is_running(self, svc):
        # Check our tracked process first
        proc = self.procs.get(svc["port"])
        if proc and proc.poll() is None:
            return True
        # Fall back to port probe (catches orphans from restart.sh)
        return port_open(svc["port"])

    def start(self, svc):
        if self.is_running(svc):
            return True

        cwd = svc["cwd"]
        log_path = svc["log"]

        # Build step (Go backend)
        if svc.get("build_cmd"):
            try:
                subprocess.run(
                    svc["build_cmd"], cwd=cwd,
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                    timeout=60, check=True,
                )
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
                notify(f"{svc['name']}: build failed", str(e))
                return False

        env = os.environ.copy()
        if svc.get("env_extra"):
            env.update(svc["env_extra"])

        log_file = open(log_path, "a")
        try:
            proc = subprocess.Popen(
                svc["run_cmd"],
                cwd=cwd,
                stdout=log_file,
                stderr=log_file,
                env=env,
                start_new_session=True,
            )
        except Exception as e:
            notify(f"{svc['name']}: start failed", str(e))
            log_file.close()
            return False

        self.procs[svc["port"]] = proc
        notify(f"{svc['name']} started", f"PID {proc.pid}, port :{svc['port']}")

        # Tailscale serve for TV frontend
        if svc.get("tailscale_serve"):
            ts = svc["tailscale_serve"]
            try:
                subprocess.Popen(
                    ["tailscale", "serve", "--bg",
                     f"--set-path={ts['path']}", ts["target"]],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )
            except Exception:
                pass

        return True

    def stop(self, svc):
        port = svc["port"]

        # Tailscale serve off
        if svc.get("tailscale_serve"):
            ts = svc["tailscale_serve"]
            try:
                subprocess.Popen(
                    ["tailscale", "serve", "--bg",
                     f"--set-path={ts['path']}", "off"],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )
            except Exception:
                pass

        # Kill the entire process group (npx spawns child node processes)
        proc = self.procs.get(port)
        if proc and proc.poll() is None:
            try:
                os.killpg(proc.pid, signal.SIGTERM)
            except OSError:
                pass
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(proc.pid, signal.SIGKILL)
                except OSError:
                    pass
                try:
                    proc.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    pass

        # pkill fallback for orphans
        if port_open(port):
            try:
                subprocess.run(
                    ["pkill", "-f", svc["pkill_pattern"]],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )
            except Exception:
                pass
            time.sleep(0.5)

        self.procs.pop(port, None)
        notify(f"{svc['name']} stopped")

    def start_all(self):
        for svc in SERVICE_DEFS:
            self.start(svc)

    def stop_all(self):
        for svc in SERVICE_DEFS:
            if self.is_running(svc):
                self.stop(svc)

    def check_crashes(self):
        """Detect services that were running but have crashed."""
        for svc in SERVICE_DEFS:
            port = svc["port"]
            running = self.is_running(svc)
            prev = self.prev_status.get(port)
            if prev is True and not running:
                notify(f"{svc['name']} crashed", f"Port :{port} no longer responding")
            self.prev_status[port] = running


class TrayApp:
    def __init__(self):
        self.mgr = ServiceManager()
        self.tailnet_domain = get_tailnet_domain()

        self.indicator = AppIndicator.Indicator.new(
            "canadahack-daemon",
            "network-offline",
            AppIndicator.IndicatorCategory.APPLICATION_STATUS,
        )
        self.indicator.set_status(AppIndicator.IndicatorStatus.ACTIVE)

        self.build_menu()
        GLib.timeout_add_seconds(HEALTH_INTERVAL, self.on_health_tick)

    def build_menu(self):
        menu = Gtk.Menu()

        # Header
        header = Gtk.MenuItem(label="CanadaHack Services")
        header.set_sensitive(False)
        menu.append(header)
        menu.append(Gtk.SeparatorMenuItem())

        # Per-service items
        self.svc_items = []
        for svc in SERVICE_DEFS:
            running = self.mgr.is_running(svc)
            dot = "\u25cf" if running else "\u25cb"
            state = "Running" if running else "Stopped"
            label = f"{dot} {svc['name']} :{svc['port']} - {state}"

            item = Gtk.MenuItem(label=label)
            submenu = Gtk.Menu()

            # Start/Stop toggle
            if running:
                action = Gtk.MenuItem(label="Stop")
                action.connect("activate", self.on_stop, svc)
            else:
                action = Gtk.MenuItem(label="Start")
                action.connect("activate", self.on_start, svc)
            submenu.append(action)

            # Log file link
            log_item = Gtk.MenuItem(label=f"Log: {svc['log']}")
            log_item.connect("activate", self.on_open_log, svc["log"])
            submenu.append(log_item)

            # Tailscale URL (for services that have serve config or are the cloud frontend)
            if self.tailnet_domain:
                if svc["port"] == 5173:
                    url = f"https://{self.tailnet_domain}"
                    url_item = Gtk.MenuItem(label=url)
                    url_item.set_sensitive(False)
                    submenu.append(url_item)
                elif svc.get("tailscale_serve"):
                    ts = svc["tailscale_serve"]
                    url = f"https://{self.tailnet_domain}{ts['path']}"
                    url_item = Gtk.MenuItem(label=url)
                    url_item.set_sensitive(False)
                    submenu.append(url_item)

            item.set_submenu(submenu)
            menu.append(item)
            self.svc_items.append((item, svc))

        menu.append(Gtk.SeparatorMenuItem())

        # Start/Stop All
        start_all = Gtk.MenuItem(label="Start All")
        start_all.connect("activate", self.on_start_all)
        menu.append(start_all)

        stop_all = Gtk.MenuItem(label="Stop All")
        stop_all.connect("activate", self.on_stop_all)
        menu.append(stop_all)

        menu.append(Gtk.SeparatorMenuItem())

        # Quit
        quit_item = Gtk.MenuItem(label="Quit Daemon")
        quit_item.connect("activate", self.on_quit)
        menu.append(quit_item)

        menu.show_all()
        self.indicator.set_menu(menu)

    def update_icon(self):
        statuses = [self.mgr.is_running(svc) for svc in SERVICE_DEFS]
        if all(statuses):
            self.indicator.set_icon_full("network-server", "All services running")
        elif any(statuses):
            self.indicator.set_icon_full("network-idle", "Some services running")
        else:
            self.indicator.set_icon_full("network-offline", "All services stopped")

    def on_health_tick(self):
        self.mgr.check_crashes()
        self.build_menu()
        self.update_icon()
        return True  # keep the timer alive

    def on_start(self, _widget, svc):
        self.mgr.start(svc)
        self.build_menu()
        self.update_icon()

    def on_stop(self, _widget, svc):
        self.mgr.stop(svc)
        self.build_menu()
        self.update_icon()

    def on_start_all(self, _widget):
        self.mgr.start_all()
        self.build_menu()
        self.update_icon()

    def on_stop_all(self, _widget):
        self.mgr.stop_all()
        self.build_menu()
        self.update_icon()

    def on_open_log(self, _widget, log_path):
        try:
            subprocess.Popen(
                ["xdg-open", log_path],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
        except Exception:
            pass

    def on_quit(self, _widget):
        Gtk.main_quit()


def main():
    # Let Ctrl+C work
    signal.signal(signal.SIGINT, signal.SIG_DFL)

    app = TrayApp()
    app.update_icon()
    Gtk.main()


if __name__ == "__main__":
    main()
