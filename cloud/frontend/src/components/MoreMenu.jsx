import { useState, useEffect, useRef } from 'react'
import styles from './MoreMenu.module.css'

export default function MoreMenu({ onRename, onDelete, onShare }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className={styles.wrap} onClick={e => e.stopPropagation()}>
      <button
        className={styles.trigger}
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        title="More options"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="2.5" r="1.2" fill="currentColor"/>
          <circle cx="7" cy="7" r="1.2" fill="currentColor"/>
          <circle cx="7" cy="11.5" r="1.2" fill="currentColor"/>
        </svg>
      </button>
      {open && (
        <div className={styles.dropdown}>
          {onShare && (
            <button className={styles.item} onClick={() => { setOpen(false); onShare() }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M4.5 8.5a2 2 0 100-4 2 2 0 000 4zM9.5 5.5a2 2 0 100-4 2 2 0 000 4zM9.5 12.5a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.1"/>
                <path d="M6.3 7.4l1.4.7M6.3 5.6l1.4-.7" stroke="currentColor" strokeWidth="1.1"/>
              </svg>
              Share publicly
            </button>
          )}
          {onRename && (
            <button className={styles.item} onClick={() => { setOpen(false); onRename() }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
              Rename
            </button>
          )}
          {onDelete && (
            <button className={`${styles.item} ${styles.itemDanger}`} onClick={() => { setOpen(false); onDelete() }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 4h9M5.5 4V2.5h3V4M6 6.5v4M8 6.5v4M3.5 4l.5 7.5h6L11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
