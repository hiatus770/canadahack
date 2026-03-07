import { useState, useEffect, useRef } from 'react'
import styles from './page.module.css'
import { AVATARS } from '../data/content'
import {
  IconFileDoc, IconFileScript, IconFileSheet,
  IconFilePresentation, IconFileBackup, FileThumb,
} from './icons'
import MoreMenu from './MoreMenu'

const KIND_MAP = {
  document:     { Icon: IconFileDoc,          label: 'Document',     thumb: { fill: '#ADC7FC', stroke: '#5A82DE' }, dark: false },
  script:       { Icon: IconFileScript,       label: 'Script',       thumb: { fill: '#DAD6D5', stroke: '#706E6D' }, dark: true  },
  spreadsheet:  { Icon: IconFileSheet,        label: 'Spreadsheet',  thumb: { fill: '#CBF4C9', stroke: '#09825D' }, dark: false },
  presentation: { Icon: IconFilePresentation, label: 'Presentation', thumb: { fill: '#F8E5B9', stroke: '#BB5504' }, dark: false },
  backup:       { Icon: IconFileBackup,       label: 'Backup',       thumb: { fill: '#DAD6D5', stroke: '#706E6D' }, dark: false },
  log:          { Icon: IconFileDoc,          label: 'Log',          thumb: { fill: '#DAD6D5', stroke: '#706E6D' }, dark: true  },
  config:       { Icon: IconFileDoc,          label: 'Config',       thumb: { fill: '#ADC7FC', stroke: '#5A82DE' }, dark: false },
  image:        { Icon: IconFileDoc,          label: 'Image',        thumb: { fill: '#EFDDFD', stroke: '#995FC3' }, dark: false },
  video:        { Icon: IconFileDoc,          label: 'Video',        thumb: { fill: '#F8E5B9', stroke: '#BB5504' }, dark: false },
  audio:        { Icon: IconFileDoc,          label: 'Audio',        thumb: { fill: '#CBF4C9', stroke: '#09825D' }, dark: false },
  folder:       { Icon: IconFileDoc,          label: 'Folder',       thumb: { fill: '#ADC7FC', stroke: '#5A82DE' }, dark: false },
}

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'])
const TEXT_EXTS = new Set([
  '.txt', '.md', '.json', '.yaml', '.yml', '.toml', '.ini', '.conf', '.cfg',
  '.sh', '.py', '.go', '.js', '.ts', '.jsx', '.tsx', '.rb', '.pl', '.csv',
  '.log', '.xml', '.html', '.css', '.sql', '.acl', '.env', '.rs', '.c', '.h',
])

function getExt(name) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

function FilePreviewContent({ file }) {
  const ext = getExt(file.name)
  const [text, setText] = useState(null)

  useEffect(() => {
    if (!file.path || !TEXT_EXTS.has(ext)) return
    fetch(`/api/preview?path=${encodeURIComponent(file.path)}`)
      .then(r => r.json())
      .then(d => { if (d.type === 'text') setText(d.content) })
      .catch(() => {})
  }, [file.path, ext])

  if (IMAGE_EXTS.has(ext) && file.path) {
    return (
      <img
        src={`/api/download?path=${encodeURIComponent(file.path)}`}
        alt={file.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    )
  }

  if (TEXT_EXTS.has(ext) && text !== null) {
    return (
      <pre style={{
        margin: 0,
        padding: '10px 12px',
        fontSize: '9px',
        lineHeight: 1.5,
        color: 'var(--gray-600)',
        fontFamily: 'monospace',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        height: '100%',
        textAlign: 'left',
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        {text.slice(0, 600)}
      </pre>
    )
  }

  return null
}

export default function FileCard({ file, selected, onSelect, onDelete, onRename }) {
  const { name, kind, collabs = [] } = file
  const { Icon, label, thumb, dark } = KIND_MAP[kind] ?? KIND_MAP.document
  const ext = getExt(name)
  const hasRichPreview = IMAGE_EXTS.has(ext) || TEXT_EXTS.has(ext)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState(name)
  const renameRef = useRef(null)

  const extPart = getExt(name)
  const baseName = extPart ? name.slice(0, -extPart.length) : name

  function startRename() {
    setRenameVal(baseName)
    setRenaming(true)
    setTimeout(() => renameRef.current?.select(), 0)
  }

  function commitRename() {
    const trimmed = renameVal.trim()
    if (!trimmed) { setRenaming(false); return }
    const newName = trimmed + extPart
    if (newName !== name) onRename?.(file, newName)
    setRenaming(false)
  }

  return (
    <div
      className={`${styles.fileCard} ${selected ? styles.fileCardSelected : ''}`}
      onClick={() => !renaming && onSelect?.(name)}
      style={{ position: 'relative' }}
    >
      <div className={styles.cardMoreBtn} onClick={e => e.stopPropagation()}>
        <MoreMenu
          onRename={onRename ? startRename : undefined}
          onDelete={onDelete ? () => onDelete(file) : undefined}
        />
      </div>
      <div className={`${styles.filePreview} ${dark && !hasRichPreview ? styles.filePreviewDark : ''}`}
        style={hasRichPreview ? { padding: 0, alignItems: 'stretch', justifyContent: 'flex-start' } : {}}
      >
        {hasRichPreview ? (
          <FilePreviewContent file={file} />
        ) : (
          <>
            <div className={styles.fileTypeIcon}><Icon /></div>
            <span className={styles.fileTypeLabel}>{label}</span>
          </>
        )}
        {collabs.length > 0 && (
          <div className={styles.fileCollabs}>
            {collabs.map(key => {
              const av = AVATARS[key]
              return av ? (
                <div key={key} className={styles.collabAv} style={{ background: av.bg }}>
                  {av.initials}
                </div>
              ) : null
            })}
          </div>
        )}
      </div>
      <div className={styles.fileInfo}>
        <FileThumb fill={thumb.fill} stroke={thumb.stroke} />
        {renaming ? (
          <input
            ref={renameRef}
            className={styles.renameInput}
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false) }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className={styles.fileName}>{name}</span>
        )}
      </div>
    </div>
  )
}

// Exported so pages can use same KIND_MAP for list rows
export { KIND_MAP }
