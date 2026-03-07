const API = '/api'

export async function listMachines() {
  const res = await fetch(`${API}/machines`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listFiles(path) {
  const res = await fetch(`${API}/files?path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listAllFiles() {
  const res = await fetch(`${API}/files/all`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function downloadFile(path) {
  const res = await fetch(`${API}/download?path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error(await res.text())
  const blob = await res.blob()
  const name = path.split('/').pop()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function uploadFile(path, file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API}/upload?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createFolder(path) {
  const res = await fetch(`${API}/mkdir?path=${encodeURIComponent(path)}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteFile(path) {
  const res = await fetch(`${API}/files?path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function renameFile(oldPath, newPath) {
  const res = await fetch(`${API}/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPath, newPath }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listShares() {
  const res = await fetch(`${API}/shares`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createShare(name, path) {
  const res = await fetch(`${API}/shares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, path }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function removeShare(name) {
  const res = await fetch(`${API}/shares/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getStatus() {
  const res = await fetch(`${API}/status`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getStorage() {
  const res = await fetch(`${API}/storage`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function previewFile(path) {
  const res = await fetch(`${API}/preview?path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function whoami() {
  const res = await fetch(`${API}/whoami`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getComments(path) {
  const res = await fetch(`${API}/comments?path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function addComment(path, text, author) {
  const res = await fetch(`${API}/comments?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, author }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── Public share links ──

export async function createPublicShare(path, label, oneTime) {
  const res = await fetch(`${API}/public-shares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, label, oneTime }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listPublicShares() {
  const res = await fetch(`${API}/public-shares`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deletePublicShare(id) {
  const res = await fetch(`${API}/public-shares/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function togglePublicShare(id) {
  const res = await fetch(`${API}/public-shares/${encodeURIComponent(id)}/toggle`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
