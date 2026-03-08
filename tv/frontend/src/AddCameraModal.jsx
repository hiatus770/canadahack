import { useState } from 'react'
import { addCamera } from './api'
import styles from './AddCameraModal.module.css'

export default function AddCameraModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', location: '', node: '', port: '8554' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await addCamera({ ...form, port: Number(form.port) })
      onAdded()
      onClose()
    } catch (err) {
      setError('Failed to add camera. Check the details and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Camera</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Name
            <input className={styles.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Front Door" required />
          </label>
          <label className={styles.label}>
            Location
            <input className={styles.input} value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Living Room" required />
          </label>
          <label className={styles.label}>
            Tailscale IP / Hostname
            <input className={styles.input} value={form.node} onChange={e => set('node', e.target.value)} placeholder="e.g. 100.x.x.x" required />
          </label>
          <label className={styles.label}>
            Port
            <input className={styles.input} type="number" value={form.port} onChange={e => set('port', e.target.value)} placeholder="8554" required />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Adding…' : 'Add Camera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
