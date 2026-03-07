import styles from '../components/page.module.css'
import { KIND_MAP } from '../components/FileCard'
import { AVATARS, RECENT_FILES } from '../data/content'
import { FileThumb } from '../components/icons'
import { useSearch } from '../context/SearchContext'

export default function Recent() {
  const { query } = useSearch()
  const q = query.toLowerCase()
  const files = q ? RECENT_FILES.filter(f => f.name.toLowerCase().includes(q)) : RECENT_FILES

  return (
    <main className={styles.main}>
      <div className={styles.pageHeader}>
        <span className={styles.pageTitle}>Recent</span>
      </div>

      <div className={styles.content}>
        <div className={styles.sectionLabel}>Recently opened — {files.length} items</div>
        {files.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No results for "{query}"</div>
            <div className={styles.emptyText}>Try a different search term.</div>
          </div>
        ) : (
        <div className={styles.fileList}>
          {files.map(f => {
            const { Icon, label, dark, thumb } = KIND_MAP[f.kind] ?? KIND_MAP.document
            return (
              <div key={f.name} className={styles.fileRow}>
                <div className={`${styles.rowThumb} ${dark ? styles.rowThumbDark : ''}`}>
                  <Icon />
                </div>
                <span className={styles.rowName}>{f.name}</span>
                <span className={styles.rowMeta} style={{ marginRight: 8 }}>{label}</span>
                {f.collabs.length > 0 && (
                  <div className={styles.rowCollabs} style={{ marginRight: 8 }}>
                    {f.collabs.map(key => {
                      const av = AVATARS[key]
                      return av ? (
                        <div key={key} className={styles.collabAv} style={{ background: av.bg }}>
                          {av.initials}
                        </div>
                      ) : null
                    })}
                  </div>
                )}
                <span className={styles.rowMeta}>{f.when}</span>
                <div className={styles.rowActions}>
                  <FileThumb fill={thumb.fill} stroke={thumb.stroke} />
                </div>
              </div>
            )
          })}
        </div>
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
    </main>
  )
}
