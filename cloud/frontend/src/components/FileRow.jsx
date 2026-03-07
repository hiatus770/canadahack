import styles from './page.module.css'
import { AVATARS } from '../data/content'
import { KIND_MAP } from './FileCard'

export default function FileRow({ file, selected, onSelect }) {
  const { name, kind, collabs = [] } = file
  const { Icon, label, thumb, dark } = KIND_MAP[kind] ?? KIND_MAP.document

  return (
    <div
      className={`${styles.fileRow} ${selected ? styles.fileRowSelected : ''}`}
      onClick={() => onSelect?.(name)}
    >
      <div className={`${styles.rowThumb} ${dark ? styles.rowThumbDark : ''}`}>
        <Icon />
      </div>
      <span className={styles.rowName}>{name}</span>
      <span className={styles.rowMeta}>{label}</span>
      {collabs.length > 0 && (
        <div className={styles.rowCollabs}>
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
  )
}
