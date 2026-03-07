import styles from './FeedPanel.module.css'
import { IconFilter, IconMenu } from './icons'
import { FEED_EVENTS, WEEK_DAYS } from './data'

export default function FeedPanel() {
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
        {FEED_EVENTS.map(e => (
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
