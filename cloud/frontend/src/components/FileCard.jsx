import styles from './page.module.css'
import { AVATARS } from '../data/content'
import {
  IconFileDoc, IconFileScript, IconFileSheet,
  IconFilePresentation, IconFileBackup, FileThumb,
} from './icons'

const KIND_MAP = {
  document:     { Icon: IconFileDoc,          label: 'Document',     thumb: { fill: '#ADC7FC', stroke: '#5A82DE' }, dark: false },
  script:       { Icon: IconFileScript,       label: 'Script',       thumb: { fill: '#DAD6D5', stroke: '#706E6D' }, dark: true  },
  spreadsheet:  { Icon: IconFileSheet,        label: 'Spreadsheet',  thumb: { fill: '#CBF4C9', stroke: '#09825D' }, dark: false },
  presentation: { Icon: IconFilePresentation, label: 'Presentation', thumb: { fill: '#F8E5B9', stroke: '#BB5504' }, dark: false },
  backup:       { Icon: IconFileBackup,       label: 'Backup',       thumb: { fill: '#DAD6D5', stroke: '#706E6D' }, dark: false },
  log:          { Icon: IconFileDoc,          label: 'Log',          thumb: { fill: '#DAD6D5', stroke: '#706E6D' }, dark: true  },
  config:       { Icon: IconFileDoc,          label: 'Config',       thumb: { fill: '#ADC7FC', stroke: '#5A82DE' }, dark: false },
}

export default function FileCard({ file, selected, onSelect }) {
  const { name, kind, collabs = [] } = file
  const { Icon, label, thumb, dark } = KIND_MAP[kind] ?? KIND_MAP.document

  return (
    <div
      className={`${styles.fileCard} ${selected ? styles.fileCardSelected : ''}`}
      onClick={() => onSelect?.(name)}
    >
      <div className={`${styles.filePreview} ${dark ? styles.filePreviewDark : ''}`}>
        <div className={styles.fileTypeIcon}><Icon /></div>
        <span className={styles.fileTypeLabel}>{label}</span>
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
        <span className={styles.fileName}>{name}</span>
      </div>
    </div>
  )
}

// Exported so pages can use same KIND_MAP for list rows
export { KIND_MAP }
