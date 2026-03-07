// The cam backend is a single-camera server.
// These helpers map the multi-camera frontend API to the actual backend routes.

export async function fetchCameras() {
  const res = await fetch('/api/status')
  if (!res.ok) return []
  const cam = await res.json()
  return [cam]
}

export async function fetchCamera(camId) {
  const res = await fetch('/api/status')
  if (!res.ok) return null
  return res.json()
}

export async function fetchAlerts(limit = 50, cameraId = null) {
  const [clipsRes, statusRes] = await Promise.all([
    fetch('/api/clips'),
    fetch('/api/status'),
  ])
  if (!clipsRes.ok) return []
  const clips = await clipsRes.json()
  const status = statusRes.ok ? await statusRes.json() : {}
  const cameraName = status.name || 'Camera'

  return clips.reverse().slice(0, limit).map(c => {
    // Extract event type from clip id: e.g. "20260307_154350_person" → "person"
    const parts = (c.id || '').split('_')
    const rawType = parts[parts.length - 1] || 'motion'
    const type = rawType.charAt(0).toUpperCase() + rawType.slice(1)
    return {
      id: c.id,
      camera_name: cameraName,
      type: rawType,
      event_type: type,
      timestamp: c.timestamp,
    }
  })
}

export async function fetchClips(camId) {
  const res = await fetch('/api/clips')
  if (!res.ok) return []
  return res.json()
}

export function getStreamUrl(camId, options = {}) {
  const params = new URLSearchParams()
  if (options.fps) params.set('fps', String(options.fps))
  if (options.quality) params.set('quality', String(options.quality))
  const query = params.toString()
  return `/api/stream${query ? `?${query}` : ''}`
}

export function getSnapshotUrl(camId, tick = null) {
  const suffix = tick === null ? '' : `?t=${tick}`
  return `/api/snapshot${suffix}`
}

export function getClipDownloadUrl(camId, clipId) {
  return `/api/clips/${clipId}`
}

export function getClipThumbUrl(camId, clipId) {
  return `/api/clips/${clipId}/thumb`
}

export async function sendCommand(camId, command) {
  const res = await fetch('/api/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  })
  if (!res.ok) return null
  return res.json()
}

export function connectAlertWS(onAlert) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const ws = new WebSocket(`${proto}//localhost:8000/api/ws`)

  ws.onmessage = (event) => {
    try {
      const alert = JSON.parse(event.data)
      onAlert(alert)
    } catch { /* ignore */ }
  }

  ws.onclose = () => {
    setTimeout(() => connectAlertWS(onAlert), 3000)
  }

  return () => ws.close()
}
