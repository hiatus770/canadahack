const API_BASE = '/api'

export async function fetchCameras() {
  const res = await fetch(`${API_BASE}/cameras`)
  if (!res.ok) return []
  return res.json()
}

export async function fetchCamera(camId) {
  const res = await fetch(`${API_BASE}/cameras/${camId}`)
  if (!res.ok) return null
  return res.json()
}

export async function fetchAlerts(limit = 50, cameraId = null) {
  const params = new URLSearchParams({ limit })
  if (cameraId) params.set('camera_id', cameraId)
  const res = await fetch(`${API_BASE}/alerts?${params}`)
  if (!res.ok) return []
  return res.json()
}

export async function fetchClips(camId) {
  const res = await fetch(`${API_BASE}/cameras/${camId}/clips`)
  if (!res.ok) return []
  return res.json()
}

export function getStreamUrl(camId, options = {}) {
  const params = new URLSearchParams()
  if (options.fps) params.set('fps', String(options.fps))
  if (options.quality) params.set('quality', String(options.quality))
  const query = params.toString()
  return `${API_BASE}/cameras/${camId}/stream${query ? `?${query}` : ''}`
}

export function getSnapshotUrl(camId, tick = null) {
  const suffix = tick === null ? '' : `?t=${tick}`
  return `${API_BASE}/cameras/${camId}/snapshot${suffix}`
}

export function getClipDownloadUrl(camId, clipId) {
  return `${API_BASE}/cameras/${camId}/clips/${clipId}`
}

export async function sendCommand(camId, command) {
  const res = await fetch(`${API_BASE}/cameras/${camId}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  })
  if (!res.ok) return null
  return res.json()
}

/**
 * Connect to the real-time alert WebSocket.
 * Returns a cleanup function.
 */
export function connectAlertWS(onAlert) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const ws = new WebSocket(`${proto}//${location.host}/api/ws`)

  ws.onmessage = (event) => {
    try {
      const alert = JSON.parse(event.data)
      onAlert(alert)
    } catch { /* ignore */ }
  }

  ws.onclose = () => {
    // Auto-reconnect after 3s
    setTimeout(() => connectAlertWS(onAlert), 3000)
  }

  return () => ws.close()
}
