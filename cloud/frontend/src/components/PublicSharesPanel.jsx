import { useState, useEffect } from 'react'
import styles from './PublicSharesPanel.module.css'
import { listPublicShares, togglePublicShare, deletePublicShare } from '../api'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  function handleCopy(e) {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button className={`${styles.btnCopy} ${copied ? styles.copied : ''}`} onClick={handleCopy} title="Copy URL">
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path d="M3 7.5l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M9.5 4.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      )}
    </button>
  )
}

function StatusBadge({ share }) {
  if (!share.active) {
    return (
      <span className={`${styles.badge} ${styles.badgeDisabled}`}>
        <span className={styles.badgeDot} />
        Disabled
      </span>
    )
  }
  if (share.oneTime) {
    return (
      <span className={`${styles.badge} ${styles.badgeOneTime}`}>
        <span className={styles.badgeDot} />
        One-time
      </span>
    )
  }
  return (
    <span className={`${styles.badge} ${styles.badgeActive}`}>
      <span className={styles.badgeDot} />
      Active
    </span>
  )
}

function formatDate(unix) {
  if (!unix) return '—'
  const d = new Date(unix * 1000)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function getShareUrl(share) {
  return `${window.location.origin}/s/${share.id}`
}

export default function PublicSharesPanel() {
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    listPublicShares()
      .then(data => setShares(data || []))
      .catch(err => console.error('Failed to load shares:', err))
      .finally(() => setLoading(false))
  }, [])

  async function handleToggle(id) {
    try {
      await togglePublicShare(id)
      setShares(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s))
    } catch (err) {
      console.error('Toggle failed:', err)
    }
  }

  async function handleDelete(id) {
    try {
      await deletePublicShare(id)
      setShares(prev => prev.filter(s => s.id !== id))
      setConfirmDelete(null)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        Loading shares...
      </div>
    )
  }

  if (shares.length === 0) {
    return (
      <div className={styles.empty}>
        <svg className={styles.emptyIcon} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className={styles.emptyTitle}>No public shares</div>
        <div className={styles.emptyText}>
          Share files publicly by clicking the share button on any file, then manage your links here.
        </div>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>URL</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {shares.map(share => (
            <tr key={share.id}>
              <td>
                <div className={styles.label}>{share.label}</div>
                <div className={styles.path}>{share.path}</div>
              </td>
              <td>
                <StatusBadge share={share} />
              </td>
              <td>
                <div className={styles.urlCell}>
                  <span className={styles.urlText}>{getShareUrl(share)}</span>
                  <CopyButton text={getShareUrl(share)} />
                </div>
              </td>
              <td>
                <span className={styles.date}>{formatDate(share.createdAt)}</span>
              </td>
              <td>
                {confirmDelete === share.id ? (
                  <div className={styles.actions}>
                    <span className={styles.confirmText}>Delete?</span>
                    <button className={styles.btnConfirm} onClick={() => handleDelete(share.id)}>Yes</button>
                    <button className={styles.btnCancelDelete} onClick={() => setConfirmDelete(null)}>No</button>
                  </div>
                ) : (
                  <div className={styles.actions}>
                    <button className={styles.btnToggle} onClick={() => handleToggle(share.id)}>
                      {share.active ? 'Disable' : 'Enable'}
                    </button>
                    <button className={styles.btnDelete} onClick={() => setConfirmDelete(share.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
