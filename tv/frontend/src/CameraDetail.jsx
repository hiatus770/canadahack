import styles from './CameraDetail.module.css'
import { IconMotion, IconRecord, IconNode, IconClose } from './icons'

export default function CameraDetail({ camera, onClose }) {
  if (!camera) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="7" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M22 13l8-4v14l-8-4V13Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        </div>
        <span>Select a camera to view details</span>
      </div>
    )
  }

  const isOffline = camera.status === 'offline'

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div className={styles.camName}>{camera.name}</div>
          <div className={styles.camLoc}>{camera.location}</div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>
          <IconClose size={14} />
        </button>
      </div>

      {/* Status */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Status</div>
        <div className={`${styles.statusBadge} ${isOffline ? styles.statusOff : styles.statusLive}`}>
          <div className={`${styles.statusDot} ${isOffline ? styles.dotOff : styles.dotLive}`} />
          {isOffline ? 'Offline' : 'Live'}
        </div>
      </div>

      {/* Stats grid */}
      <div className={styles.statsGrid}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Resolution</span>
          <span className={styles.statValue}>{camera.resolution}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Last motion</span>
          <span className={styles.statValue}>{camera.lastMotion}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Recording</span>
          <span className={`${styles.statValue} ${camera.recording ? styles.statGreen : styles.statMuted}`}>
            {camera.recording ? 'Active' : 'Off'}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Motion alerts</span>
          <span className={`${styles.statValue} ${camera.motion ? styles.statOrange : styles.statMuted}`}>
            {camera.motion ? 'Detected' : 'Clear'}
          </span>
        </div>
      </div>

      {/* Tailnet node */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Tailnet Node</div>
        <div className={styles.nodeRow}>
          <IconNode size={14} />
          <span className={styles.nodeIp}>{camera.node}</span>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Controls</div>
        <div className={styles.controlsGrid}>
          <button className={`${styles.ctrlBtn} ${styles.ctrlBtnPrimary}`} disabled={isOffline}>
            {camera.recording ? 'Stop recording' : 'Start recording'}
          </button>
          <button className={`${styles.ctrlBtn} ${styles.ctrlBtnSecondary}`} disabled={isOffline}>
            {camera.motion ? 'Mute alerts' : 'Enable alerts'}
          </button>
          <button className={`${styles.ctrlBtn} ${styles.ctrlBtnSecondary}`}>
            View history
          </button>
          <button className={`${styles.ctrlBtn} ${styles.ctrlBtnDanger}`}>
            Reboot camera
          </button>
        </div>
      </div>
    </div>
  )
}
