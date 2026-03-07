import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import styles from '../components/page.module.css'
import FileCard from '../components/FileCard'
import FileRow from '../components/FileRow'
import SortDropdown, { useSort, useSortedFiles } from '../components/SortDropdown'
import { IconChevronRight, IconGrid, IconList } from '../components/icons'
import { FOLDER_CONTENTS } from '../data/content'
import { useSearch } from '../context/SearchContext'

export default function FolderView() {
  const { slug } = useParams()
  const folder = FOLDER_CONTENTS[slug]
  const [view, setView] = useState('grid')
  const [selected, setSelected] = useState(null)
  const { sort, setSort } = useSort()
  const { query } = useSearch()

  if (!folder) return <Navigate to="/drive" replace />

  const q = query.toLowerCase()
  const files = useSortedFiles(
    q ? folder.files.filter(f => f.name.toLowerCase().includes(q)) : folder.files,
    sort
  )

  return (
    <main className={styles.main}>
      <div className={styles.pageHeader}>
        <Link to="/drive" className={styles.breadcrumbLink}>My Drive</Link>
        <span className={styles.breadcrumbChevron}><IconChevronRight /></span>
        <span className={styles.pageTitle}>{folder.name}</span>
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
        <div className={styles.sectionLabel}>Files</div>
        {files.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No results for "{query}"</div>
            <div className={styles.emptyText}>Try a different search term.</div>
          </div>
        ) : view === 'grid' ? (
          <div className={styles.filesGrid}>
            {files.map(f => (
              <FileCard key={f.name} file={f} selected={selected === f.name} onSelect={setSelected} />
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
        <span className={styles.statusText}>{files.length} files</span>
        <span className={styles.statusRight}>Last synced: just now</span>
      </div>
    </main>
  )
}
