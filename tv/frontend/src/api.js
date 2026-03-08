// Multi-camera API layer — talks to the TailTV backend (port 8000),
// which proxies streams and clips from individual cam instances.

export async function fetchCameras() {
  const res = await fetch('/api/cameras')
  if (!res.ok) return []
  return res.json()
}

export async function fetchCamera(camId) {
  const res = await fetch(`/api/cameras/${camId}`)
  if (!res.ok) return null
  return res.json()
}

export async function fetchAlerts(limit = 50, cameraId = null) {
  // Aggregate clips from all cameras to build the event feed.
  const camsRes = await fetch('/api/cameras')
  if (!camsRes.ok) return []
  const cameras = await camsRes.json()

  const clipsPerCam = await Promise.all(
    cameras.map(c =>
      fetch(`/api/cameras/${c.id}/clips`)
        .then(r => r.ok ? r.json() : [])
        .then(clips => clips.map(clip => ({ ...clip, camera_id: c.id, camera_name: c.name })))
        .catch(() => [])
    )
  )

  let allClips = clipsPerCam.flat()
  if (cameraId) allClips = allClips.filter(c => c.camera_id === cameraId)
  allClips.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  return allClips.slice(0, limit).map(c => {
    const parts = (c.id || '').split('_')
    const rawType = parts[parts.length - 1] || 'motion'
    const type = rawType.charAt(0).toUpperCase() + rawType.slice(1)
    return {
      id: c.id,
      camera_id: c.camera_id,
      camera_name: c.camera_name,
      type: rawType,
      event_type: type,
      timestamp: c.timestamp,
    }
  })
}

export async function fetchClips(camId) {
  const res = await fetch(`/api/cameras/${camId}/clips`)
  if (!res.ok) return []
  return res.json()
}

export function getStreamUrl(camId, options = {}) {
  const params = new URLSearchParams()
  if (options.fps) params.set('fps', String(options.fps))
  if (options.quality) params.set('quality', String(options.quality))
  const query = params.toString()
  return `/api/cameras/${camId}/stream${query ? `?${query}` : ''}`
}

export function getSnapshotUrl(camId, tick = null) {
  const suffix = tick === null ? '' : `?t=${tick}`
  return `/api/cameras/${camId}/snapshot${suffix}`
}

export function getClipDownloadUrl(camId, clipId) {
  return `/api/cameras/${camId}/clips/${clipId}`
}

export function getClipThumbUrl(camId, clipId) {
  return `/api/cameras/${camId}/clips/${clipId}/thumb`
}

export async function addCamera({ name, location, node, port }) {
  const res = await fetch('/api/cameras/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, location, node, port }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteCamera(camId) {
  const res = await fetch(`/api/cameras/${camId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function sendCommand(camId, command) {
  const res = await fetch(`/api/cameras/${camId}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  })
  if (!res.ok) return null
  return res.json()
}

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
    setTimeout(() => connectAlertWS(onAlert), 3000)
  }

  return () => ws.close()
}
