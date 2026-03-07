import { useState, useEffect, useCallback } from 'react'
import styles from './FileViewer.module.css'
import { downloadFile, previewFile, whoami, getComments, addComment } from '../api'
import { KIND_MAP } from './FileCard'
import { useApp } from '../context/AppContext'

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp']

function getExt(name) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeAgo(ts) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function FileViewer({ file, onClose, onShare }) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState([])
  const [user, setUser] = useState(null)
  const { notify } = useApp()

  const ext = getExt(file.name)
  const isImage = IMAGE_EXTS.includes(ext)
  const kindInfo = KIND_MAP[file.kind] || KIND_MAP.document

  // Fetch current user identity
  useEffect(() => {
    whoami()
      .then(setUser)
      .catch(() => setUser({ displayName: 'Anonymous' }))
  }, [])

  // Fetch comments from server
  useEffect(() => {
    getComments(file.path)
      .then(setComments)
      .catch(() => setComments([]))
  }, [file.path])

  useEffect(() => {
    if (isImage) {
      setLoading(false)
      return
    }

    setLoading(true)
    previewFile(file.path)
      .then(setPreview)
      .catch(() => setPreview({ type: 'binary', content: '' }))
      .finally(() => setLoading(false))
  }, [file.path, isImage])

  const handleClose = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleClose)
    return () => document.removeEventListener('keydown', handleClose)
  }, [handleClose])

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleDownload() {
    downloadFile(file.path)
  }

  function handleAddComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    const author = user?.displayName || 'Anonymous'
    addComment(file.path, commentText.trim(), author)
      .then(newComment => {
        setComments(prev => [newComment, ...prev])
        setCommentText('')
        notify(`${author} commented on "${file.name}"`, 'comment')
      })
      .catch(err => console.error('Failed to post comment:', err))
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose} title="Back">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className={styles.fileName}>{file.name}</span>
          <div className={styles.headerActions}>
            {onShare && (
              <button className={styles.downloadBtn} onClick={() => onShare(file)} style={{ background: 'var(--gray-50)' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M4.5 8.5a2 2 0 100-4 2 2 0 000 4zM9.5 5.5a2 2 0 100-4 2 2 0 000 4zM9.5 12.5a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.1"/>
                  <path d="M6.3 7.4l1.4.7M6.3 5.6l1.4-.7" stroke="currentColor" strokeWidth="1.1"/>
                </svg>
                Share
              </button>
            )}
            <button className={styles.downloadBtn} onClick={handleDownload}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v9M3.5 7L7 10.5 10.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Download
            </button>
            <button className={styles.closeBtn} onClick={onClose} title="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Preview area */}
          <div className={styles.preview}>
            {loading ? (
              <span className={styles.loadingPreview}>Loading preview...</span>
            ) : isImage ? (
              <img
                className={styles.imagePreview}
                src={`/api/download?path=${encodeURIComponent(file.path)}`}
                alt={file.name}
              />
            ) : preview?.type === 'text' && preview.content ? (
              <pre className={styles.textContent}>{preview.content}</pre>
            ) : (
              <div className={styles.filePlaceholder}>
                <div className={styles.placeholderIcon}>
                  <kindInfo.Icon />
                </div>
                <div className={styles.placeholderName}>{file.name}</div>
                <div className={styles.placeholderMeta}>
                  {kindInfo.label} &middot; {formatBytes(file.size)}
                  <br />
                  No preview available
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className={styles.sidebar}>
            <div className={styles.sidebarSection}>
              <div className={styles.sidebarTitle}>Details</div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Type</span>
                <span className={styles.detailValue}>{kindInfo.label}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Size</span>
                <span className={styles.detailValue}>{formatBytes(file.size)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Modified</span>
                <span className={styles.detailValue}>{formatDate(file.modified)}</span>
              </div>
              {file.machine && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Machine</span>
                  <span className={styles.detailValue}>{file.machine}</span>
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Extension</span>
                <span className={styles.detailValue}>{ext || 'none'}</span>
              </div>
            </div>

            <div className={styles.commentsSection}>
              <div className={styles.sidebarTitle}>Comments</div>
              <form className={styles.commentForm} onSubmit={handleAddComment}>
                <input
                  className={styles.commentInput}
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                />
                <button className={styles.commentSubmit} type="submit" disabled={!commentText.trim()}>
                  Post
                </button>
              </form>
              {comments.length === 0 ? (
                <div className={styles.noComments}>No comments yet</div>
              ) : (
                <div className={styles.commentsList}>
                  {comments.map(c => (
                    <div key={c.id} className={styles.comment}>
                      <span className={styles.commentText}>{c.text}</span>
                      <span className={styles.commentMeta}>{c.author} &middot; {timeAgo(c.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
