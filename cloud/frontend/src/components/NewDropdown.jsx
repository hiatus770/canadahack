import { useRef, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import styles from './NewDropdown.module.css'
import { IconFolderPlus, IconUpload } from './icons'
import { createFolder, uploadFile, listMachines, listFiles } from '../api'
import { useApp } from '../context/AppContext'

function ModalOverlay({ children, onClose }) {
  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {children}
      </div>
    </div>
  )
}

export default function NewDropdown({ onClose }) {
  const fileInputRef = useRef()
  const location = useLocation()
  const { notify } = useApp()

  const [mode, setMode] = useState(null) // null | 'folder' | 'upload'
  const [folderName, setFolderName] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  // Machine/share picker state
  const [machines, setMachines] = useState([])
  const [shares, setShares] = useState([])
  const [selectedPath, setSelectedPath] = useState(null)
  const [pickerStep, setPickerStep] = useState(null) // null | 'machine' | 'share'
  const [loadingShares, setLoadingShares] = useState(false)
  const [isSelfMachine, setIsSelfMachine] = useState(false)

  // Detect if selectedPath is machine-level (creating a share, not a subfolder)
  function isShareLevel(path) {
    if (!path) return false
    const parts = path.replace(/^\//, '').split('/')
    return parts.length === 1 // just /machinename
  }

  function getCurrentPath() {
    const params = new URLSearchParams(location.search)
    const path = params.get('path')
    if (path) return path
    const match = location.pathname.match(/^\/machine\/(.+)/)
    if (match) return '/' + match[1]
    return null
  }

  const currentPath = getCurrentPath()

  function startAction(action) {
    if (currentPath) {
      setSelectedPath(currentPath)
      setMode(action)
    } else {
      // Need to pick a machine first
      setMode(action)
      setPickerStep('machine')
      listMachines()
        .then(setMachines)
        .catch(() => setMachines([]))
    }
  }

  function handlePickMachine(machine) {
    setIsSelfMachine(!!machine.isSelf)
    // Load shares for this machine
    setLoadingShares(true)
    listFiles('/' + machine.name)
      .then(entries => {
        const dirs = entries.filter(e => e.isDir)
        if (dirs.length === 0) {
          // No shares/subfolders — use machine root
          setSelectedPath('/' + machine.name)
          setPickerStep(null)
        } else if (dirs.length === 1) {
          // Single share — auto-select
          setSelectedPath(dirs[0].path)
          setPickerStep(null)
        } else {
          setShares(dirs)
          setPickerStep('share')
        }
      })
      .catch(() => {
        setSelectedPath('/' + machine.name)
        setPickerStep(null)
      })
      .finally(() => setLoadingShares(false))
  }

  function handlePickShare(share) {
    setSelectedPath(share.path)
    setPickerStep(null)
  }

  // When picker resolves and mode is upload, trigger file input
  useEffect(() => {
    if (selectedPath && mode === 'upload' && !pickerStep) {
      fileInputRef.current?.click()
    }
  }, [selectedPath, mode, pickerStep])

  async function handleCreateFolder(e) {
    e.preventDefault()
    const target = selectedPath || currentPath
    if (!folderName.trim() || !target) return
    setCreating(true)
    setError('')

    const creatingShare = isShareLevel(target)

    try {
      await createFolder(target.replace(/\/$/, '') + '/' + folderName.trim())
      if (creatingShare) {
        notify(`Created share "${folderName.trim()}"`, 'share')
      } else {
        notify(`Created folder "${folderName.trim()}"`, 'folder')
      }
      onClose()
      window.location.reload()
    } catch (err) {
      setError('Failed: ' + err.message)
      setCreating(false)
    }
  }

  async function onFileSelected(e) {
    const target = selectedPath || currentPath
    const file = e.target.files[0]
    if (!file || !target) return

    try {
      await uploadFile(target, file)
      notify(`Uploaded "${file.name}"`, 'upload')
      window.location.reload()
    } catch (err) {
      notify('Upload failed: ' + err.message, 'error')
    }
    onClose()
  }

  // ── Machine/share picker modal ──
  if (pickerStep === 'machine') {
    return (
      <ModalOverlay onClose={onClose}>
        <div className={styles.modalTitle}>
          {mode === 'folder' ? 'Create folder in...' : 'Upload to...'}
        </div>
        <div className={styles.pickerList}>
          {machines.length === 0 ? (
            <div className={styles.pickerEmpty}>Loading machines...</div>
          ) : (
            machines.filter(m => m.isSelf || m.shares?.length > 0).map(m => (
              <button
                key={m.name}
                className={styles.pickerItem}
                onClick={() => handlePickMachine(m)}
              >
                <span className={styles.pickerIcon}>💻</span>
                <span className={styles.pickerName}>{m.name}</span>
                {m.isSelf && <span className={styles.pickerBadge}>This machine</span>}
              </button>
            ))
          )}
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.folderCancel} onClick={onClose}>Cancel</button>
        </div>
      </ModalOverlay>
    )
  }

  if (pickerStep === 'share') {
    return (
      <ModalOverlay onClose={onClose}>
        <div className={styles.modalTitle}>
          {mode === 'folder' ? 'Create folder in...' : 'Upload to...'}
        </div>
        <div className={styles.pickerList}>
          {loadingShares ? (
            <div className={styles.pickerEmpty}>Loading...</div>
          ) : (
            shares.map(s => (
              <button
                key={s.path}
                className={styles.pickerItem}
                onClick={() => handlePickShare(s)}
              >
                <span className={styles.pickerIcon}>📁</span>
                <span className={styles.pickerName}>{s.name}</span>
              </button>
            ))
          )}
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.folderCancel} onClick={() => setPickerStep('machine')}>Back</button>
          <button className={styles.folderCancel} onClick={onClose}>Cancel</button>
        </div>
      </ModalOverlay>
    )
  }

  // ── Folder name modal ──
  if (mode === 'folder' && selectedPath && !pickerStep) {
    const creatingShare = isShareLevel(selectedPath)
    const isRemoteShare = creatingShare && !isSelfMachine && !currentPath

    if (isRemoteShare) {
      return (
        <ModalOverlay onClose={onClose}>
          <div className={styles.modalTitle}>Cannot create share</div>
          <div className={styles.modalDesc}>
            Shares can only be created on your own machine. Pick a different machine or select an existing share.
          </div>
          <div className={styles.modalFooter}>
            <button className={styles.folderCancel} onClick={() => setPickerStep('machine')}>Back</button>
            <button className={styles.folderCancel} onClick={onClose}>Cancel</button>
          </div>
        </ModalOverlay>
      )
    }

    return (
      <ModalOverlay onClose={onClose}>
        <form onSubmit={handleCreateFolder} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={styles.modalTitle}>{creatingShare ? 'New share' : 'New folder'}</div>
          <div className={styles.modalPath}>
            {creatingShare
              ? `Creates a new Tailscale Drive share on ${selectedPath.replace(/^\//, '')}`
              : `in ${selectedPath}`}
          </div>
          <input
            className={styles.folderInput}
            type="text"
            value={folderName}
            onChange={e => setFolderName(e.target.value)}
            placeholder={creatingShare ? 'Share name' : 'Folder name'}
            autoFocus
          />
          {error && <div className={styles.folderError}>{error}</div>}
          <div className={styles.modalFooter}>
            <button type="button" className={styles.folderCancel} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.folderSubmit} disabled={!folderName.trim() || creating}>
              {creating ? 'Creating...' : creatingShare ? 'Create share' : 'Create'}
            </button>
          </div>
        </form>
      </ModalOverlay>
    )
  }

  // ── Default menu ──
  return (
    <div className={styles.dropdown}>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={onFileSelected}
      />
      <button className={styles.item} onClick={() => startAction('folder')}>
        <span className={styles.itemIcon}><IconFolderPlus /></span>
        New folder
      </button>
      <button className={styles.item} onClick={() => startAction('upload')}>
        <span className={styles.itemIcon}><IconUpload /></span>
        Upload file
      </button>
    </div>
  )
}
