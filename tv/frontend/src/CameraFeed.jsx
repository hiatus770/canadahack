import { useState } from 'react'
import styles from './CameraFeed.module.css'
import { IconMotion, IconRecord, IconMaximize, IconPlay, IconPause } from './icons'

// Deterministic color pattern per camera for the placeholder feed
const FEED_COLORS = [
  ['#1a1f2e', '#0d1117'],
  ['#1a2e1e', '#0d170f'],
  ['#2e1a1a', '#17100d'],
  ['#1e1a2e', '#100d17'],
  ['#2e2a1a', '#17160d'],
  ['#1a2a2e', '#0d1617'],
]

export default function CameraFeed({ camera, selected, onSelect, onFullscreen }) {
  const [playing, setPlaying] = useState(true)
  const [c1, c2] = FEED_COLORS[(camera.id - 1) % FEED_COLORS.length]
  const isOffline = camera.status === 'offline'

  return (
    <div
      className={`${styles.feed} ${selected ? styles.feedSelected : ''} ${isOffline ? styles.feedOffline : ''}`}
      onClick={() => onSelect(camera.id)}
    >
      {/* Video area */}
      <div className={styles.video} style={{ background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)` }}>
        {isOffline ? (
          <div className={styles.offlineMsg}>
            <div className={styles.offlineDot} />
            <span>Offline</span>
          </div>
        ) : (
          <>
            {/* Simulated scan lines */}
            <div className={styles.scanlines} />
            {/* Camera name overlay top-left */}
            <div className={styles.topBar}>
              <div className={styles.livePill}>
                <span className={styles.liveDot} />
                LIVE
              </div>
              <span className={styles.resBadge}>{camera.resolution}</span>
            </div>
            {/* Motion indicator */}
            {camera.motion && (
              <div className={styles.motionPill}>
                <IconMotion size={12} />
                Motion
              </div>
            )}
            {/* Controls overlay */}
            <div className={styles.controls}>
              <button className={styles.ctrlBtn} onClick={e => { e.stopPropagation(); setPlaying(v => !v) }}>
                {playing ? <IconPause size={14} /> : <IconPlay size={14} />}
              </button>
              <button className={styles.ctrlBtn} onClick={e => { e.stopPropagation(); onFullscreen(camera) }}>
                <IconMaximize size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <div className={`${styles.statusDot} ${isOffline ? styles.statusDotOff : camera.motion ? styles.statusDotMotion : styles.statusDotLive}`} />
          <span className={styles.camName}>{camera.name}</span>
          <span className={styles.camLoc}>{camera.location}</span>
        </div>
        <div className={styles.footerRight}>
          {camera.recording && !isOffline && (
            <span className={styles.recIcon}><IconRecord size={12} /></span>
          )}
        </div>
      </div>
    </div>
  )
}
