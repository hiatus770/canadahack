import { useState } from 'react'
import styles from '../components/page.module.css'
import { KIND_MAP } from '../components/FileCard'
import { IconRestore, IconX } from '../components/icons'

export default function Trash() {
  const [items, setItems] = useState([])

  function restore(name) {
    setItems(prev => prev.filter(f => f.name !== name))
  }

  function deleteForever(name) {
    setItems(prev => prev.filter(f => f.name !== name))
  }

  function emptyTrash() {
    setItems([])
  }

  return (
    <main className={styles.main}>
      <div className={styles.pageHeader}>
        <span className={styles.pageTitle}>Trash</span>
        <div className={styles.toolbar}>
          {items.length > 0 && (
            <button className={styles.dangerBtn} onClick={emptyTrash}>
              Empty trash
            </button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {items.length === 0 ? (
          <div className={styles.empty}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ color: 'var(--gray-300)' }}>
              <path d="M8 14h32l-3 26H11L8 14Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M4 14h40M18 14v-4h12v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M20 22v10M28 22v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div className={styles.emptyTitle}>Trash is empty</div>
            <div className={styles.emptyText}>Items you delete will appear here. They'll be permanently deleted after 30 days.</div>
          </div>
        ) : (
          <>
            <div className={styles.sectionLabel}>
              {items.length} item{items.length !== 1 ? 's' : ''} in trash · Items are deleted after 30 days
            </div>
            <div className={styles.fileList}>
              {items.map(f => {
                const { Icon, label, dark } = KIND_MAP[f.kind] ?? KIND_MAP.document
                return (
                  <div key={f.name} className={styles.fileRow}>
                    <div className={`${styles.rowThumb} ${dark ? styles.rowThumbDark : ''}`}>
                      <Icon />
                    </div>
                    <span className={styles.rowName}>{f.name}</span>
                    <span className={styles.rowMeta} style={{ marginRight: 8 }}>{label}</span>
                    <span className={styles.rowMeta}>Deleted {f.deletedWhen}</span>
                    <div className={styles.rowActions}>
                      <button
                        className={styles.actionBtn}
                        title="Restore"
                        onClick={e => { e.stopPropagation(); restore(f.name) }}
                      >
                        <IconRestore />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        title="Delete forever"
                        onClick={e => { e.stopPropagation(); deleteForever(f.name) }}
                      >
                        <IconX />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className={styles.statusBar}>
        <div className={styles.statusConnected}>
          <div className={styles.statusDot} />
          Tailnet connected
        </div>
        <span className={styles.statusText}>{items.length} item{items.length !== 1 ? 's' : ''} in trash</span>
        <span className={styles.statusRight}>Items deleted after 30 days</span>
      </div>
    </main>
  )
}
