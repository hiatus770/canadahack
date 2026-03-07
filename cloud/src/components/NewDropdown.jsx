import styles from './NewDropdown.module.css'
import { IconFolderPlus, IconUpload } from './icons'

const ITEMS = [
  { Icon: IconFolderPlus, label: 'New folder',    dividerAfter: false },
  { Icon: IconUpload,     label: 'Upload file',   dividerAfter: false },
  { Icon: IconUpload,     label: 'Upload folder', dividerAfter: false },
]

export default function NewDropdown({ onClose }) {
  return (
    <div className={styles.dropdown}>
      {ITEMS.map(({ Icon, label, dividerAfter }) => (
        <div key={label}>
          <button className={styles.item} onClick={onClose}>
            <span className={styles.itemIcon}><Icon /></span>
            {label}
          </button>
          {dividerAfter && <div className={styles.divider} />}
        </div>
      ))}
    </div>
  )
}
