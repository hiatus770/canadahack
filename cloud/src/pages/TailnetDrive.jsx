import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import styles from '../components/page.module.css'
import FileCard from '../components/FileCard'
import FileRow from '../components/FileRow'
import SortDropdown, { useSort, useSortedFiles } from '../components/SortDropdown'
import { FolderIcon, IconGrid, IconList } from '../components/icons'
import { DRIVE_CONTENTS } from '../data/content'
import { useSearch } from '../context/SearchContext'

export default function TailnetDrive() {
  const { name } = useParams()
  const drive = DRIVE_CONTENTS[name]
  const [view, setView] = useState('grid')
  const [selected, setSelected] = useState(null)
  const { sort, setSort } = useSort()
  const { query } = useSearch()

  if (!drive) return <Navigate to="/drive" replace />

  const q = query.toLowerCase()
  const folders = q ? drive.folders.filter(f => f.name.toLowerCase().includes(q)) : drive.folders
  const files   = useSortedFiles(
    q ? drive.files.filter(f => f.name.toLowerCase().includes(q)) : drive.files,
    sort
  )

  return (
    <main className={styles.main}>
      <div className={styles.pageHeader}>
        <span className={styles.pageTitle}>{drive.label}</span>
        <div className={styles.machineBadge}>
          <div className={styles.machineDot} />
          {drive.ip}
        </div>
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
        {folders.length > 0 && (
          <>
            <div className={styles.sectionLabel}>Folders</div>
            <div className={styles.foldersGrid} style={{ marginBottom: 28 }}>
              {folders.map(({ name: folderName, fill, stroke }) => (
                <div key={folderName} className={styles.folderItem}>
                  <FolderIcon fill={fill} stroke={stroke} />
                  <span className={styles.folderName}>{folderName}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {files.length > 0 && (
          <>
            <div className={styles.sectionLabel}>Files</div>
            {view === 'grid' ? (
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
          </>
        )}

        {folders.length === 0 && files.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No results for "{query}"</div>
            <div className={styles.emptyText}>Try a different search term.</div>
          </div>
        )}
      </div>

      <div className={styles.statusBar}>
        <div className={styles.statusConnected}>
          <div className={styles.statusDot} />
          Connected to {drive.label}
        </div>
        <span className={styles.statusText}>{files.length + folders.length} items</span>
        <span className={styles.statusRight}>Last synced: just now</span>
      </div>
    </main>
  )
}
