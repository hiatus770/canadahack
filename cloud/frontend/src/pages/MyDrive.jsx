import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from '../components/page.module.css'
import FileCard from '../components/FileCard'
import FileRow from '../components/FileRow'
import SortDropdown, { useSort, useSortedFiles } from '../components/SortDropdown'
import { FolderIcon, IconGrid, IconList } from '../components/icons'
import { useSearch } from '../context/SearchContext'
import { listAllFiles, listMachines } from '../api'
import FileViewer from '../components/FileViewer'

const FOLDER_COLORS = [
  { fill: '#ADC7FC', stroke: '#5A82DE' },
  { fill: '#CBF4C9', stroke: '#33C27F' },
  { fill: '#F8E5B9', stroke: '#BB5504' },
  { fill: '#EFDDFD', stroke: '#995FC3' },
  { fill: '#DAD6D5', stroke: '#AFACAB' },
]

export default function MyDrive() {
  const [view, setView] = useState('grid')
  const [selected, setSelected] = useState(null)
  const { sort, setSort } = useSort()
  const { query } = useSearch()
  const navigate = useNavigate()

  const [entries, setEntries] = useState([])
  const [machines, setMachines] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewerFile, setViewerFile] = useState(null)

  useEffect(() => {
    Promise.all([listAllFiles(), listMachines()])
      .then(([files, machs]) => {
        setEntries(files)
        setMachines(machs)
      })
      .catch(err => console.error('Failed to load:', err))
      .finally(() => setLoading(false))
  }, [])

  const q = query.toLowerCase()

  // Separate folders and files from entries
  const allFolders = entries.filter(e => e.isDir)
  const allFiles = entries.filter(e => !e.isDir)

  const folders = q ? allFolders.filter(f => f.name.toLowerCase().includes(q)) : allFolders
  const files = useSortedFiles(
    q ? allFiles.filter(f => f.name.toLowerCase().includes(q)) : allFiles,
    sort
  )

  function handleFolderClick(folder) {
    navigate(`/browse?path=${encodeURIComponent(folder.path)}`)
  }

  return (
    <main className={styles.main}>
      <div className={styles.pageHeader}>
        <span className={styles.pageTitle}>My Drive</span>
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
            <div className={styles.emptyTitle}>Loading files...</div>
            <div className={styles.emptyText}>Scanning tailnet drives</div>
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
                      <div key={folder.path} className={styles.folderItem} onClick={() => handleFolderClick(folder)} style={{ cursor: 'pointer' }}>
                        <FolderIcon fill={color.fill} stroke={color.stroke} />
                        <span className={styles.folderName}>{folder.name}</span>
                        {folder.machine && (
                          <span style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 2 }}>{folder.machine}</span>
                        )}
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

            {!loading && folders.length === 0 && files.length === 0 && (
              <div className={styles.empty}>
                {query ? (
                  <>
                    <div className={styles.emptyTitle}>No results for "{query}"</div>
                    <div className={styles.emptyText}>Try a different search term.</div>
                  </>
                ) : (
                  <>
                    <div className={styles.emptyTitle}>No files found</div>
                    <div className={styles.emptyText}>No machines on your tailnet are sharing files, or they may be offline.</div>
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
          Tailnet connected
        </div>
        <span className={styles.statusText}>{files.length} files, {folders.length} folders across {machines.length} machines</span>
        <span className={styles.statusRight}>Last synced: just now</span>
      </div>

      {viewerFile && <FileViewer file={viewerFile} onClose={() => setViewerFile(null)} />}
    </main>
  )
}
