import { useState, useEffect } from 'react'
import styles from '../components/page.module.css'
import { KIND_MAP } from '../components/FileCard'
import { FileThumb } from '../components/icons'
import { useSearch } from '../context/SearchContext'
import { listAllFiles } from '../api'
import FileViewer from '../components/FileViewer'

function formatRelativeTime(isoString) {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function Recent() {
  const { query } = useSearch()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewerFile, setViewerFile] = useState(null)

  useEffect(() => {
    listAllFiles()
      .then(files => {
        const recentFiles = files
          .filter(f => !f.isDir)
          .sort((a, b) => new Date(b.modified) - new Date(a.modified))
        setEntries(recentFiles)
      })
      .catch(err => console.error('Failed to load recent files:', err))
      .finally(() => setLoading(false))
  }, [])

  const q = query.toLowerCase()
  const files = q ? entries.filter(f => f.name.toLowerCase().includes(q)) : entries

  return (
    <main className={styles.main}>
      <div className={styles.pageHeader}>
        <span className={styles.pageTitle}>Recent</span>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Loading recent files...</div>
            <div className={styles.emptyText}>Scanning tailnet drives</div>
          </div>
        ) : files.length === 0 ? (
          <div className={styles.empty}>
            {query ? (
              <>
                <div className={styles.emptyTitle}>No results for "{query}"</div>
                <div className={styles.emptyText}>Try a different search term.</div>
              </>
            ) : (
              <>
                <div className={styles.emptyTitle}>No recent files</div>
                <div className={styles.emptyText}>No files found on your tailnet.</div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className={styles.sectionLabel}>Recently opened — {files.length} items</div>
            <div className={styles.fileList}>
              {files.map(f => {
                const { Icon, label, dark, thumb } = KIND_MAP[f.kind] ?? KIND_MAP.document
                return (
                  <div key={f.path} className={styles.fileRow} onClick={() => setViewerFile(f)} style={{ cursor: 'pointer' }}>
                    <div className={`${styles.rowThumb} ${dark ? styles.rowThumbDark : ''}`}>
                      <Icon />
                    </div>
                    <span className={styles.rowName}>{f.name}</span>
                    <span className={styles.rowMeta} style={{ marginRight: 8 }}>{label}</span>
                    <span className={styles.rowMeta}>{formatRelativeTime(f.modified)}</span>
                    <div className={styles.rowActions}>
                      <FileThumb fill={thumb.fill} stroke={thumb.stroke} />
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
        <span className={styles.statusText}>{files.length} recently opened</span>
        <span className={styles.statusRight}>Last synced: just now</span>
      </div>

      {viewerFile && <FileViewer file={viewerFile} onClose={() => setViewerFile(null)} />}
    </main>
  )
}
