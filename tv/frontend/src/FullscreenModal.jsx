import styles from './FullscreenModal.module.css'
import { IconClose, IconRecord, IconMotion } from './icons'

const FEED_COLORS = [
  ['#1a1f2e', '#0d1117'],
  ['#1a2e1e', '#0d170f'],
  ['#2e1a1a', '#17100d'],
  ['#1e1a2e', '#100d17'],
  ['#2e2a1a', '#17160d'],
  ['#1a2a2e', '#0d1617'],
]

export default function FullscreenModal({ camera, onClose }) {
  if (!camera) return null

  const [c1, c2] = FEED_COLORS[(camera.id - 1) % FEED_COLORS.length]

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.info}>
            <div className={styles.livePill}>
              <span className={styles.liveDot} />
              LIVE
            </div>
            <span className={styles.name}>{camera.name}</span>
            <span className={styles.loc}>{camera.location}</span>
            <span className={styles.res}>{camera.resolution}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <IconClose size={16} />
          </button>
        </div>

        {/* Feed */}
        <div
          className={styles.feed}
          style={{ background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)` }}
        >
          <div className={styles.scanlines} />
          {camera.motion && (
            <div className={styles.motionBadge}>
              <IconMotion size={14} />
              Motion detected
            </div>
          )}
          {camera.recording && (
            <div className={styles.recBadge}>
              <IconRecord size={14} />
              Recording
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span className={styles.footerNode}>Node: {camera.node}</span>
          <span className={styles.footerMotion}>Last motion: {camera.lastMotion}</span>
        </div>
      </div>
    </div>
  )
}
