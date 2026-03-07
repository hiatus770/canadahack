import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import styles from './NewDropdown.module.css'
import { IconFolderPlus, IconUpload } from './icons'
import { createFolder, uploadFile } from '../api'

export default function NewDropdown({ onClose }) {
  const fileInputRef = useRef()
  const location = useLocation()

  // Determine current browsing path from URL
  function getCurrentPath() {
    const params = new URLSearchParams(location.search)
    const path = params.get('path')
    if (path) return path

    // If on /machine/:name, the path is /<name>
    const match = location.pathname.match(/^\/machine\/(.+)/)
    if (match) return '/' + match[1]

    return null
  }

  async function handleNewFolder() {
    const currentPath = getCurrentPath()
    if (!currentPath) {
      alert('Navigate to a machine or folder first to create a new folder.')
      onClose()
      return
    }
    const name = prompt('Folder name:')
    if (!name) { onClose(); return }

    try {
      await createFolder(currentPath.replace(/\/$/, '') + '/' + name)
      window.location.reload()
    } catch (err) {
      alert('Failed to create folder: ' + err.message)
    }
    onClose()
  }

  async function handleUploadFile() {
    const currentPath = getCurrentPath()
    if (!currentPath) {
      alert('Navigate to a machine or folder first to upload files.')
      onClose()
      return
    }
    fileInputRef.current?.click()
  }

  async function onFileSelected(e) {
    const currentPath = getCurrentPath()
    const file = e.target.files[0]
    if (!file) return

    try {
      await uploadFile(currentPath, file)
      window.location.reload()
    } catch (err) {
      alert('Failed to upload: ' + err.message)
    }
    onClose()
  }

  return (
    <div className={styles.dropdown}>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={onFileSelected}
      />
      <button className={styles.item} onClick={handleNewFolder}>
        <span className={styles.itemIcon}><IconFolderPlus /></span>
        New folder
      </button>
      <button className={styles.item} onClick={handleUploadFile}>
        <span className={styles.itemIcon}><IconUpload /></span>
        Upload file
      </button>
    </div>
  )
}
