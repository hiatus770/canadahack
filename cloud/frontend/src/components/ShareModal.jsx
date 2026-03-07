import { useState } from 'react'
import styles from './ShareModal.module.css'
import { createPublicShare } from '../api'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button className={`${styles.btnCopy} ${copied ? styles.copied : ''}`} onClick={handleCopy} title="Copy">
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7.5l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M9.5 4.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      )}
    </button>
  )
}

export default function ShareModal({ file, onClose }) {
  const [oneTime, setOneTime] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function handleCreate() {
    setLoading(true)
    setError('')
    try {
      const data = await createPublicShare(file.path, file.name, oneTime)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Failed to create share link')
    } finally {
      setLoading(false)
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  if (result) {
    return (
      <div className={styles.overlay} onClick={handleOverlayClick}>
        <div className={styles.modal}>
          <div>
            <div className={styles.title}>Share link created</div>
            <div className={styles.subtitle}>{file.name}</div>
          </div>

          <div className={styles.resultSection}>
            <div className={styles.label}>Public URL</div>
            <div className={styles.resultBox}>
              <span className={styles.resultValue}>{result.url}</span>
              <CopyButton text={result.url} />
            </div>
          </div>

          <div className={styles.resultSection}>
            <div className={styles.label}>Password</div>
            <div className={styles.resultBox}>
              <span className={styles.resultValue}>{result.password}</span>
              <CopyButton text={result.password} />
            </div>
          </div>

          <div className={styles.warning}>
            <svg className={styles.warningIcon} width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L1 12h12L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              <path d="M7 5v3M7 10v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Save this password — it won't be shown again.
          </div>

          <div className={styles.footer}>
            <button className={styles.btnDone} onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div>
          <div className={styles.title}>Share publicly</div>
          <div className={styles.subtitle}>Create a password-protected public link</div>
        </div>

        <div className={styles.field}>
          <div className={styles.label}>File</div>
          <div className={styles.fileName}>{file.name}</div>
        </div>

        <div className={styles.field}>
          <label className={styles.toggle} onClick={() => setOneTime(v => !v)}>
            <div className={`${styles.toggleSwitch} ${oneTime ? styles.active : ''}`} />
            <div>
              <div>One-time link</div>
              <div className={styles.toggleDesc}>Link expires when the visitor closes their tab</div>
            </div>
          </label>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button className={styles.btnCreate} onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create public link'}
          </button>
        </div>
      </div>
    </div>
  )
}
