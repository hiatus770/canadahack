import { useState, useEffect, useRef } from 'react'
import styles from './Cameras.module.css'
import pageStyles from '../components/page.module.css'

export default function Cameras() {
  const [camUrl, setCamUrl] = useState(() => localStorage.getItem('camUrl') || '')
  const [connected, setConnected] = useState(false)
  const [settings, setSettings] = useState(null)
  const [status, setStatus] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState({})
  const pollRef = useRef()

  // Connect / fetch settings + status
  async function connect(url) {
    const base = url.replace(/\/+$/, '')
    setError('')
    try {
      const [sRes, stRes] = await Promise.all([
        fetch(`${base}/settings`),
        fetch(`${base}/status`),
      ])
      if (!sRes.ok || !stRes.ok) throw new Error('Could not reach camera')
      const s = await sRes.json()
      const st = await stRes.json()
      setSettings(s)
      setDraft(s)
      setStatus(st)
      setConnected(true)
      localStorage.setItem('camUrl', base)
      setCamUrl(base)
    } catch (e) {
      setError(e.message || 'Connection failed')
      setConnected(false)
      setSettings(null)
      setStatus(null)
    }
  }

  // Poll status while connected
  useEffect(() => {
    if (!connected || !camUrl) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${camUrl}/status`)
        if (res.ok) setStatus(await res.json())
      } catch {}
    }, 5000)
    return () => clearInterval(pollRef.current)
  }, [connected, camUrl])

  // Auto-connect on mount if saved
  useEffect(() => {
    if (camUrl) connect(camUrl)
  }, [])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${camUrl}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      setSettings({ ...settings, ...draft })
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleDraft(key, value) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  const dirty = settings && Object.keys(draft).some(k => String(draft[k]) !== String(settings[k]))

  return (
    <main className={pageStyles.main}>
      <div className={pageStyles.pageHeader}>
        <h1 className={pageStyles.pageTitle}>Cameras</h1>
      </div>

      <div className={pageStyles.content}>
        {/* Connection bar */}
        <div className={styles.connectBar}>
          <div className={styles.connectInputWrap}>
            <input
              className={styles.connectInput}
              type="text"
              value={camUrl}
              onChange={e => { setCamUrl(e.target.value); setConnected(false) }}
              placeholder="Camera URL, e.g. http://100.64.0.5:8554"
            />
            {connected && <div className={styles.connectedBadge}>Connected</div>}
          </div>
          <button className={styles.connectBtn} onClick={() => connect(camUrl)} disabled={!camUrl}>
            {connected ? 'Refresh' : 'Connect'}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {connected && status && (
          <>
            {/* Status cards */}
            <div className={styles.statusGrid}>
              <StatusCard label="Status" value={status.status} accent={status.status === 'live' ? 'green' : 'gray'} />
              <StatusCard label="Name" value={status.name} />
              <StatusCard label="Location" value={status.location} />
              <StatusCard label="Resolution" value={status.resolution} />
              <StatusCard label="Battery" value={`${status.battery}%`} accent={status.battery < 20 ? 'red' : 'green'} />
              <StatusCard label="WiFi" value={`${status.wifi}%`} />
              <StatusCard label="CPU" value={`${status.cpu ?? 0}%`} />
              <StatusCard label="FPS" value={status.fps ?? '—'} />
              <StatusCard label="Cloud Uploads" value={status.cloud_uploads ?? '—'} />
              <StatusCard label="Pending" value={status.cloud_pending ?? '—'} accent={status.cloud_pending > 0 ? 'orange' : 'gray'} />
            </div>

            {/* Live preview */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Live Preview</div>
              <div className={styles.previewWrap}>
                <img
                  src={`${camUrl}/stream?fps=5&quality=50`}
                  alt="Live stream"
                  className={styles.previewImg}
                />
              </div>
            </div>

            {/* Settings form */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Camera Settings</div>
              <div className={styles.form}>
                <SettingField label="Camera Name" desc="Display name for this camera" value={draft.cam_name} onChange={v => handleDraft('cam_name', v)} />
                <SettingField label="Location" desc="Where the camera is placed" value={draft.cam_location} onChange={v => handleDraft('cam_location', v)} />

                <div className={styles.formDivider} />

                <SettingField label="TailTV Backend URL" desc="Where this camera sends alerts and registers" value={draft.tailtv_backend_url} onChange={v => handleDraft('tailtv_backend_url', v)} placeholder="http://100.113.170.49:8000" />
                <SettingField label="TailCloud URL" desc="Backend URL for cloud uploads to Taildrive" value={draft.tailcloud_url} onChange={v => handleDraft('tailcloud_url', v)} placeholder="http://100.113.170.49:8081" />
                <SettingField label="Upload Share" desc="Taildrive share name for clips" value={draft.tailcloud_upload_share} onChange={v => handleDraft('tailcloud_upload_share', v)} placeholder="camclips" />
                <SettingField label="Resolved Path" desc="Auto-discovered upload path (read-only)" value={settings.tailcloud_upload_path || '—'} onChange={() => {}} />

                <div className={styles.formDivider} />

                <SettingField label="Clip Duration" desc="Recording length in seconds" value={draft.clip_duration} onChange={v => handleDraft('clip_duration', v)} type="number" />
                <SettingField label="Motion Sensitivity" desc="Min contour area to trigger (lower = more sensitive)" value={draft.motion_sensitivity} onChange={v => handleDraft('motion_sensitivity', v)} type="number" />
                <SettingField label="Person Confidence" desc="YOLO confidence threshold (0-1)" value={draft.person_confidence} onChange={v => handleDraft('person_confidence', v)} type="number" step="0.05" />
              </div>

              <div className={styles.formActions}>
                <button
                  className={styles.saveBtn}
                  onClick={handleSave}
                  disabled={!dirty || saving}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
                {dirty && (
                  <button className={styles.resetBtn} onClick={() => setDraft(settings)}>
                    Reset
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {!connected && !error && (
          <div className={pageStyles.empty}>
            <div className={pageStyles.emptyTitle}>No camera connected</div>
            <div className={pageStyles.emptyText}>
              Enter your TailCam URL above to manage settings and view the live feed.
            </div>
          </div>
        )}
      </div>
    </main>
  )
}


function StatusCard({ label, value, accent }) {
  const colors = {
    green: '#09825D',
    red: '#B22D30',
    orange: '#BB5504',
    gray: 'var(--gray-500)',
  }
  return (
    <div className={styles.statusCard}>
      <div className={styles.statusCardLabel}>{label}</div>
      <div className={styles.statusCardValue} style={accent ? { color: colors[accent] || colors.gray } : undefined}>
        {value}
      </div>
    </div>
  )
}


function SettingField({ label, desc, value, onChange, type = 'text', placeholder, step }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldInfo}>
        <label className={styles.fieldLabel}>{label}</label>
        {desc && <span className={styles.fieldDesc}>{desc}</span>}
      </div>
      <input
        className={styles.fieldInput}
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
      />
    </div>
  )
}
