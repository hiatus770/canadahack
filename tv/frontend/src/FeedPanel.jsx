import styles from './FeedPanel.module.css'
import { IconFilter, IconMenu } from './icons'

function getWeekDays() {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const today = new Date()
  const result = []
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    result.push({
      day: days[d.getDay()],
      date: String(d.getDate()).padStart(2, '0'),
      today: i === 0,
    })
  }
  return result
}

const WEEK_DAYS = getWeekDays()

const alertGradients = {
  motion: ['#1e2a18','#141e10'],
  person: ['#2a3a1a','#1a2810'],
  pir_alarm: ['#162814','#0e1e0c'],
  door_open: ['#1e1c28','#14121e'],
}

export default function FeedPanel({ alerts = [] }) {
  const feedEvents = alerts.map(a => ({
    id: a.id,
    cameraName: a.camera_name || `${a.location} ${a.camera_id}`,
    type: a.type === 'person' ? 'Person Detected' : a.type === 'motion' ? 'Motion' : a.type,
    time: a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : '',
    gradient: alertGradients[a.type] || ['#1a1e2e','#10121e'],
  }))
  return (
    <aside className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>Feed</span>
        <div className={styles.actions}>
          <button className={styles.iconBtn}><IconFilter size={16} /></button>
          <button className={styles.iconBtn}><IconMenu size={16} /></button>
        </div>
      </div>

      {/* Week calendar */}
      <div className={styles.week}>
        {WEEK_DAYS.map(d => (
          <button key={d.date} className={`${styles.dayBtn} ${d.today ? styles.dayBtnToday : ''}`}>
            <span className={styles.dayLabel}>{d.day}</span>
            <span className={styles.dayNum}>{d.date}</span>
          </button>
        ))}
      </div>

      {/* Events list */}
      <div className={styles.list}>
        {feedEvents.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '0.85rem' }}>
            No events yet
          </div>
        )}
        {feedEvents.map(e => (
          <div key={e.id} className={styles.eventRow}>
            <div className={styles.dot} />
            <div
              className={styles.thumb}
              style={{ background: `linear-gradient(135deg, ${e.gradient[0]}, ${e.gradient[1]})` }}
            />
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
