import { useState } from 'react'
import styles from './AlertsPanel.module.css'
import { IconMotion, IconRecord, IconCamera, IconClose } from './icons'
import { CAMERAS } from './data'

const TYPE_ICON = {
  motion:    <IconMotion size={14} />,
  offline:   <IconCamera size={14} />,
  recording: <IconRecord size={14} />,
}

const TYPE_COLOR = {
  motion:    'var(--orange-400)',
  offline:   'var(--red-400)',
  recording: 'var(--blue-400)',
}

export default function AlertsPanel({ alerts, onDismiss, onMarkAll }) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Alerts</span>
        <button className={styles.markAll} onClick={onMarkAll}>Mark all read</button>
      </div>
      <div className={styles.list}>
        {alerts.length === 0 ? (
          <div className={styles.empty}>No active alerts</div>
        ) : alerts.map(a => {
          const cam = CAMERAS.find(c => c.id === a.cameraId)
          return (
            <div key={a.id} className={`${styles.row} ${a.unread ? styles.rowUnread : ''}`}>
              <div className={styles.iconWrap} style={{ color: TYPE_COLOR[a.type] }}>
                {TYPE_ICON[a.type]}
              </div>
              <div className={styles.body}>
                <span className={styles.msg}>{a.msg}</span>
                <span className={styles.when}>{a.when}</span>
              </div>
              {a.unread && <div className={styles.dot} />}
              <button className={styles.dismiss} onClick={() => onDismiss(a.id)}>
                <IconClose size={12} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
