import styles from './FeedPanel.module.css'
import { getClipThumbUrl } from './api'

const alertGradients = {
  motion: ['#1e2a18','#141e10'],
  person: ['#2a3a1a','#1a2810'],
  pir_alarm: ['#162814','#0e1e0c'],
  door_open: ['#1e1c28','#14121e'],
}

export default function FeedPanel({ alerts = [], onSelectClip }) {
  const feedEvents = alerts.map(a => ({
    id: a.id,
    camera_id: a.camera_id,
    cameraName: a.camera_name || 'Camera',
    type: a.event_type || a.type || 'Motion',
    time: a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : '',
    gradient: alertGradients[a.type] || ['#1a1e2e','#10121e'],
    hasClip: typeof a.id === 'string' && a.id.includes('_'),
  }))

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Feed</span>
      </div>

      <div className={styles.list}>
        {feedEvents.map(e => (
          <div
            key={e.id}
            className={`${styles.eventRow} ${e.hasClip ? styles.eventRowClickable : ''}`}
            onClick={() => {
              if (e.hasClip) onSelectClip?.(e)
            }}
          >
            {e.hasClip ? (
              <img
                src={getClipThumbUrl(e.camera_id, e.id)}
                className={styles.thumb}
                style={{ objectFit: 'cover' }}
                onError={ev => { ev.currentTarget.style.background = `linear-gradient(135deg, ${e.gradient[0]}, ${e.gradient[1]})`; ev.currentTarget.removeAttribute('src') }}
              />
            ) : (
              <div
                className={styles.thumb}
                style={{ background: `linear-gradient(135deg, ${e.gradient[0]}, ${e.gradient[1]})` }}
              />
            )}
            <div className={styles.eventInfo}>
              <span className={styles.eventName}>{e.cameraName}</span>
              <span className={styles.eventType}>{e.type}</span>
              <span className={styles.eventTime}>{e.time}</span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
