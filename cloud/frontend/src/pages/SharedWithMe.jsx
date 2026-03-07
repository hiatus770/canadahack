import { useState } from 'react'
import styles from '../components/page.module.css'
import FileCard from '../components/FileCard'
import FileRow from '../components/FileRow'
import SortDropdown, { useSort, useSortedFiles } from '../components/SortDropdown'
import { IconGrid, IconList } from '../components/icons'
import { SHARED_FILES, AVATARS } from '../data/content'
import { useSearch } from '../context/SearchContext'

export default function SharedWithMe() {
  const [view, setView] = useState('grid')
  const [selected, setSelected] = useState(null)
  const { sort, setSort } = useSort()
  const { query } = useSearch()

  const q = query.toLowerCase()
  const files = useSortedFiles(
    q ? SHARED_FILES.filter(f => f.name.toLowerCase().includes(q)) : SHARED_FILES,
    sort
  )

  return (
    <main className={styles.main}>
      <div className={styles.pageHeader}>
        <span className={styles.pageTitle}>Shared with me</span>
        <div className={styles.toolbar}>
          <SortDropdown sort={sort} setSort={setSort} />
          <div className={styles.toolbarDivider} />
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${view === 'grid' ? styles.viewBtnActive : ''}`} onClick={() => setView('grid')} title="Grid view"><IconGrid /></button>
            <button className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`} onClick={() => setView('list')} title="List view"><IconList /></button>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.sectionLabel}>Shared with you — {files.length} items</div>
        {files.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No results for "{query}"</div>
            <div className={styles.emptyText}>Try a different search term.</div>
          </div>
        ) : view === 'grid' ? (
          <div className={styles.filesGrid}>
            {files.map(f => (
              <div key={f.name} style={{ position: 'relative' }}>
                <FileCard file={f} selected={selected === f.name} onSelect={setSelected} />
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 4px 0', fontSize: 11, color: 'var(--gray-400)',
                }}>
                  {AVATARS[f.sharedBy] && (
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: AVATARS[f.sharedBy].bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, fontWeight: 600, color: '#fff', flexShrink: 0,
                    }}>
                      {AVATARS[f.sharedBy].initials}
                    </div>
                  )}
                  <span>Shared {f.when}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.fileList}>
            {files.map(f => (
              <FileRow key={f.name} file={f} selected={selected === f.name} onSelect={setSelected} />
            ))}
          </div>
        )}
      </div>

      <div className={styles.statusBar}>
        <div className={styles.statusConnected}>
          <div className={styles.statusDot} />
          Tailnet connected
        </div>
        <span className={styles.statusText}>{files.length} shared with you</span>
        <span className={styles.statusRight}>Last synced: just now</span>
      </div>
    </main>
  )
}
