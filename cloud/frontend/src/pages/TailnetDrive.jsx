import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
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

export default function TailnetDrive() {
  const { name } = useParams()
  const [searchParams] = useSearchParams()
  const subpath = searchParams.get('path') || ''
  const navigate = useNavigate()
  const [view, setView] = useState('grid')
  const [selected, setSelected] = useState(null)
  const { sort, setSort } = useSort()
  const { query } = useSearch()

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewerFile, setViewerFile] = useState(null)

  const currentPath = subpath || `/${name}`

  useEffect(() => {
    setLoading(true)
    setError(null)
    listFiles(currentPath)
      .then(data => setEntries(data))
      .catch(err => {
        console.error(err)
        setError('Could not load files. Machine may be offline.')
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

  function handleFolderClick(folder) {
    navigate(`/machine/${name}?path=${encodeURIComponent(folder.path)}`)
  }

  function handleFileClick(file) {
    setViewerFile(file)
  }

  // Build breadcrumb from path
  const pathParts = currentPath.replace(/^\//, '').split('/')
  const breadcrumbs = pathParts.map((part, i) => ({
    label: part,
    path: '/' + pathParts.slice(0, i + 1).join('/'),
  }))

  return (
    <main className={styles.main}>
      <div className={styles.pageHeader}>
        {breadcrumbs.length > 1 ? (
          <>
            {breadcrumbs.map((bc, i) => (
              <span key={bc.path} style={{ display: 'inline-flex', alignItems: 'center' }}>
                {i > 0 && <span className={styles.breadcrumbChevron}><IconChevronRight /></span>}
                {i < breadcrumbs.length - 1 ? (
                  <button
                    className={styles.breadcrumbLink}
                    onClick={() => navigate(`/machine/${name}?path=${encodeURIComponent(bc.path)}`)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'var(--blue-400)', padding: 0 }}
                  >
                    {bc.label}
                  </button>
                ) : (
                  <span className={styles.pageTitle}>{bc.label}</span>
                )}
              </span>
            ))}
          </>
        ) : (
          <span className={styles.pageTitle}>{name}</span>
        )}
        <div className={styles.machineBadge}>
          <div className={styles.machineDot} />
          {name}
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
        {loading ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Loading...</div>
            <div className={styles.emptyText}>Connecting to {name}</div>
          </div>
        ) : error ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Connection Error</div>
            <div className={styles.emptyText}>{error}</div>
          </div>
        ) : (
          <>
            {folders.length > 0 && (
              <>
                <div className={styles.sectionLabel}>Folders</div>
                <div className={styles.foldersGrid} style={{ marginBottom: 28 }}>
                  {folders.map((folder, i) => {
                    const color = FOLDER_COLORS[i % FOLDER_COLORS.length]
                    return (
                      <div key={folder.path} className={styles.folderItem} onClick={() => handleFolderClick(folder)} style={{ cursor: 'pointer' }}>
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
                      <div key={f.path} onClick={() => handleFileClick(f)}>
                        <FileCard file={{ ...f, collabs: [] }} selected={selected === f.path} onSelect={() => setSelected(f.path)} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.fileList}>
                    {files.map(f => (
                      <div key={f.path} onClick={() => handleFileClick(f)}>
                        <FileRow file={{ ...f, collabs: [] }} selected={selected === f.path} onSelect={() => setSelected(f.path)} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {folders.length === 0 && files.length === 0 && (
              <div className={styles.empty}>
                {query ? (
                  <>
                    <div className={styles.emptyTitle}>No results for "{query}"</div>
                    <div className={styles.emptyText}>Try a different search term.</div>
                  </>
                ) : (
                  <>
                    <div className={styles.emptyTitle}>No shared files</div>
                    <div className={styles.emptyText}>This machine has no shared content, or it may be offline.</div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.statusBar}>
        <div className={styles.statusConnected}>
          <div className={styles.statusDot} />
          Connected to {name}
        </div>
        <span className={styles.statusText}>{files.length + folders.length} items</span>
        <span className={styles.statusRight}>Last synced: just now</span>
      </div>

      {viewerFile && <FileViewer file={viewerFile} onClose={() => setViewerFile(null)} />}
    </main>
  )
}
