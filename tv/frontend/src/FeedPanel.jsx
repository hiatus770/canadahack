import { useState } from 'react'
import styles from './FeedPanel.module.css'
import { IconFilter, IconMenu } from './icons'
import { getClipThumbUrl } from './api'

function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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
      fullDate: toYMD(d),
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

export default function FeedPanel({ alerts = [], onSelectClip }) {
  const [selectedDate, setSelectedDate] = useState(WEEK_DAYS.find(d => d.today).fullDate)

  const allEvents = alerts.map(a => ({
    id: a.id,
    cameraName: a.camera_name || 'Camera',
    type: a.event_type || a.type || 'Motion',
    time: a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : '',
    dateStr: a.timestamp ? a.timestamp.slice(0, 10) : '',
    gradient: alertGradients[a.type] || ['#1a1e2e','#10121e'],
    hasClip: typeof a.id === 'string' && a.id.includes('_'),
  }))

  const feedEvents = allEvents.filter(e => e.dateStr === selectedDate)

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
        {WEEK_DAYS.map(d => {
          const isSelected = d.fullDate === selectedDate
          return (
            <button
              key={d.date}
              className={`${styles.dayBtn} ${isSelected ? styles.dayBtnToday : ''}`}
              onClick={() => setSelectedDate(d.fullDate)}
            >
              <span className={styles.dayLabel}>{d.day}</span>
              <span className={styles.dayNum}>{d.date}</span>
            </button>
          )
        })}
      </div>

      {/* Events list */}
      <div className={styles.list}>
        {feedEvents.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📭</span>
            <span className={styles.emptyText}>No events on this day</span>
          </div>
        ) : (
          feedEvents.map(e => (
            <div
              key={e.id}
              className={`${styles.eventRow} ${e.hasClip ? styles.eventRowClickable : ''}`}
              onClick={() => e.hasClip && onSelectClip?.(e)}
            >
              <div className={styles.dot} />
              {e.hasClip ? (
                <img
                  src={getClipThumbUrl(null, e.id)}
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
          ))
        )}
      </div>
    </aside>
  )
}
