import aiosqlite
import json
from datetime import datetime, timedelta

DB_PATH = "tailtv.db"


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS cameras (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                location TEXT NOT NULL,
                node TEXT NOT NULL DEFAULT '',
                resolution TEXT DEFAULT '1280x720',
                port INTEGER DEFAULT 8554,
                wifi INTEGER DEFAULT 80,
                battery INTEGER DEFAULT 100,
                motion INTEGER DEFAULT 0,
                recording INTEGER DEFAULT 0,
                last_seen TEXT,
                registered_at TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                camera_id TEXT NOT NULL,
                camera_name TEXT NOT NULL,
                location TEXT NOT NULL,
                type TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                details TEXT DEFAULT '{}',
                FOREIGN KEY (camera_id) REFERENCES cameras(id)
            )
        """)
        await db.commit()


async def upsert_camera(cam: dict):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO cameras (id, name, location, node, resolution, port, last_seen, registered_at)
            VALUES (:id, :name, :location, :node, :resolution, :port, :last_seen, :registered_at)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                location=excluded.location,
                node=excluded.node,
                resolution=excluded.resolution,
                port=excluded.port,
                last_seen=excluded.last_seen
        """, {
            "id": cam["id"],
            "name": cam["name"],
            "location": cam["location"],
            "node": cam.get("node", ""),
            "resolution": cam.get("resolution", "1280x720"),
            "port": cam.get("port", 8554),
            "last_seen": datetime.now().isoformat(),
            "registered_at": datetime.now().isoformat(),
        })
        await db.commit()


async def remove_duplicate_node_port(node: str, port: int, keep_id: str):
    """Remove stale camera rows that point to the same node/port but different IDs."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "DELETE FROM cameras WHERE node = ? AND port = ? AND id != ?",
            (node, port, keep_id),
        )
        await db.commit()


async def update_heartbeat(cam_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE cameras SET last_seen = ? WHERE id = ?",
            (datetime.now().isoformat(), cam_id),
        )
        await db.commit()


async def update_camera_status(cam_id: str, status_data: dict):
    """Update camera status from a /status poll."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE cameras SET
                wifi = ?, battery = ?, motion = ?, recording = ?, last_seen = ?
            WHERE id = ?
        """, (
            status_data.get("wifi", 80),
            status_data.get("battery", 100),
            status_data.get("motion", 0),
            1 if status_data.get("recording", False) else 0,
            datetime.now().isoformat(),
            cam_id,
        ))
        await db.commit()


async def get_cameras() -> list[dict]:
    offline_threshold = datetime.now() - timedelta(seconds=30)
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        rows = await db.execute_fetchall("SELECT * FROM cameras")
        cameras = []
        for row in rows:
            r = dict(row)
            # Determine live/offline based on last_seen
            try:
                last = datetime.fromisoformat(r["last_seen"])
                r["status"] = "live" if last > offline_threshold else "offline"
            except (ValueError, TypeError):
                r["status"] = "offline"
            r["recording"] = bool(r.get("recording", 0))
            cameras.append(r)
        return cameras


async def get_camera(cam_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        row = await db.execute_fetchall(
            "SELECT * FROM cameras WHERE id = ?", (cam_id,)
        )
        if row:
            r = dict(row[0])
            try:
                last = datetime.fromisoformat(r["last_seen"])
                r["status"] = "live" if (datetime.now() - last).seconds < 30 else "offline"
            except (ValueError, TypeError):
                r["status"] = "offline"
            r["recording"] = bool(r.get("recording", 0))
            return r
        return None


async def insert_alert(alert: dict) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("""
            INSERT INTO alerts (camera_id, camera_name, location, type, timestamp, details)
            VALUES (:camera_id, :camera_name, :location, :type, :timestamp, :details)
        """, {
            "camera_id": alert["camera_id"],
            "camera_name": alert["camera_name"],
            "location": alert["location"],
            "type": alert["type"],
            "timestamp": alert["timestamp"],
            "details": json.dumps(alert.get("details", {})),
        })
        await db.commit()
        return cursor.lastrowid


async def get_alerts(limit: int = 50, camera_id: str | None = None) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        if camera_id:
            rows = await db.execute_fetchall(
                "SELECT * FROM alerts WHERE camera_id = ? ORDER BY id DESC LIMIT ?",
                (camera_id, limit),
            )
        else:
            rows = await db.execute_fetchall(
                "SELECT * FROM alerts ORDER BY id DESC LIMIT ?", (limit,)
            )
        results = []
        for row in rows:
            r = dict(row)
            try:
                r["details"] = json.loads(r["details"])
            except (json.JSONDecodeError, TypeError):
                r["details"] = {}
            results.append(r)
        return results
