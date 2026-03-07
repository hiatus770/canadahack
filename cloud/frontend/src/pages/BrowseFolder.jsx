import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import styles from '../components/page.module.css'
import FileCard from '../components/FileCard'
import FileRow from '../components/FileRow'
import SortDropdown, { useSort, useSortedFiles } from '../components/SortDropdown'
import { FolderIcon, IconGrid, IconList, IconChevronRight } from '../components/icons'
import { useSearch } from '../context/SearchContext'
import { listFiles } from '../api'
import FileViewer from '../components/FileViewer'

const FOLDER_COLORS = [
  { fill: '#ADC7FC', stroke: '#5A82DE' },
  { fill: '#CBF4C9', stroke: '#33C27F' },
  { fill: '#F8E5B9', stroke: '#BB5504' },
  { fill: '#EFDDFD', stroke: '#995FC3' },
  { fill: '#DAD6D5', stroke: '#AFACAB' },
]

export default function BrowseFolder() {
  const [searchParams] = useSearchParams()
  const currentPath = searchParams.get('path') || '/'
  const navigate = useNavigate()
  const [view, setView] = useState('grid')
  const [selected, setSelected] = useState(null)
  const { sort, setSort } = useSort()
  const { query } = useSearch()

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewerFile, setViewerFile] = useState(null)

  useEffect(() => {
    setLoading(true)
    listFiles(currentPath)
      .then(setEntries)
      .catch(err => {
        console.error(err)
        setEntries([])
      })
      .finally(() => setLoading(false))
  }, [currentPath])

  const q = query.toLowerCase()
  const allFolders = entries.filter(e => e.isDir)
  const allFiles = entries.filter(e => !e.isDir)

  const folders = q ? allFolders.filter(f => f.name.toLowerCase().includes(q)) : allFolders
  const files = useSortedFiles(
    q ? allFiles.filter(f => f.name.toLowerCase().includes(q)) : allFiles,
    sort
  )

  // Build breadcrumbs
  const pathParts = currentPath.replace(/^\//, '').split('/')
  const breadcrumbs = pathParts.map((part, i) => ({
    label: part,
    path: '/' + pathParts.slice(0, i + 1).join('/'),
  }))

  return (
    <main className={styles.main}>
      <div className={styles.pageHeader}>
        <Link to="/drive" className={styles.breadcrumbLink}>My Drive</Link>
        {breadcrumbs.map((bc, i) => (
          <span key={bc.path} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span className={styles.breadcrumbChevron}><IconChevronRight /></span>
            {i < breadcrumbs.length - 1 ? (
              <button
                className={styles.breadcrumbLink}
                onClick={() => navigate(`/browse?path=${encodeURIComponent(bc.path)}`)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'var(--blue-400)', padding: 0 }}
              >
                {bc.label}
              </button>
            ) : (
              <span className={styles.pageTitle}>{bc.label}</span>
            )}
          </span>
        ))}
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
        {loading ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Loading...</div>
          </div>
        ) : (
          <>
            {folders.length > 0 && (
              <>
                <div className={styles.sectionLabel}>Folders</div>
                <div className={styles.foldersGrid}>
                  {folders.map((folder, i) => {
                    const color = FOLDER_COLORS[i % FOLDER_COLORS.length]
                    return (
                      <div
                        key={folder.path}
                        className={styles.folderItem}
                        onClick={() => navigate(`/browse?path=${encodeURIComponent(folder.path)}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <FolderIcon fill={color.fill} stroke={color.stroke} />
                        <span className={styles.folderName}>{folder.name}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {files.length > 0 && (
              <>
                <div className={styles.sectionLabel}>Files</div>
                {view === 'grid' ? (
                  <div className={styles.filesGrid}>
                    {files.map(f => (
                      <div key={f.path} onClick={() => setViewerFile(f)}>
                        <FileCard file={{ ...f, collabs: [] }} selected={selected === f.path} onSelect={() => setSelected(f.path)} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.fileList}>
                    {files.map(f => (
                      <div key={f.path} onClick={() => setViewerFile(f)}>
                        <FileRow file={{ ...f, collabs: [] }} selected={selected === f.path} onSelect={() => setSelected(f.path)} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {folders.length === 0 && files.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyTitle}>Empty folder</div>
                <div className={styles.emptyText}>This folder has no contents.</div>
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.statusBar}>
        <div className={styles.statusConnected}>
          <div className={styles.statusDot} />
          Tailnet connected
        </div>
        <span className={styles.statusText}>{files.length} files, {folders.length} folders</span>
        <span className={styles.statusRight}>Last synced: just now</span>
      </div>

      {viewerFile && <FileViewer file={viewerFile} onClose={() => setViewerFile(null)} />}
    </main>
  )
}
