import styles from './CameraGrid.module.css'
import { IconWifi, IconBattery, IconMore } from './icons'
import { getStreamUrl } from './api'

function CameraCard({ camera, clipCount, onSelect }) {
  const isOffline = camera.status === 'offline'
  const [c1, c2] = camera.gradient

  return (
    <div className={styles.card} onClick={() => onSelect(camera)}>
      {/* Feed */}
      <div
        className={styles.feed}
        style={{ background: `linear-gradient(160deg, ${c1} 0%, ${c2} 100%)` }}
      >
        {/* Live MJPEG stream */}
        {!isOffline && (
          <img
            src={getStreamUrl(camera.id, { fps: 10, quality: 50 })}
            alt={camera.name}
            className={styles.streamImg}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
          />
        )}
        {/* Scanlines */}
        <div className={styles.scanlines} />

        {/* Top overlay */}
        <div className={styles.topOverlay}>
          <div className={styles.topLeft}>
            <IconWifi size={13} />
            <IconBattery size={15} />
          </div>
          <div className={styles.topRight}>
            {!isOffline && clipCount > 0 && (
              <span className={styles.motionBadge}>{clipCount}</span>
            )}
            <button className={styles.moreBtn} onClick={e => e.stopPropagation()}>
              <IconMore size={14} />
            </button>
          </div>
        </div>

        {/* Offline overlay */}
        {isOffline && (
          <div className={styles.offlineOverlay}>
            <div className={styles.offlineDot} />
            <span>Offline</span>
          </div>
        )}

        {/* Bottom info */}
        <div className={styles.feedInfo}>
          <span className={styles.feedName}>{camera.location}: {camera.name}</span>
          <span className={styles.feedTime}>{camera.date}   {camera.lastSeen}</span>
        </div>
      </div>
    </div>
  )
}

export default function CameraGrid({ cameras, locations, activeTab, setActiveTab, onSelectCamera, clipCounts = {} }) {
  const filtered = activeTab === 'All'
    ? cameras
    : cameras.filter(c => c.location === activeTab)

  // Group by location
  const groups = {}
  for (const cam of filtered) {
    if (!groups[cam.location]) groups[cam.location] = []
    groups[cam.location].push(cam)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card_outer}>
        {/* Tabs */}
        <div className={styles.tabBar}>
          <div className={styles.tabs}>
            {locations.map(loc => (
              <button
                key={loc}
                className={`${styles.tab} ${activeTab === loc ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(loc)}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {Object.entries(groups).map(([location, cams]) => (
            <div key={location} className={styles.group}>
              <h2 className={styles.groupTitle}>{location}</h2>
              <div className={styles.grid}>
                {cams.map(cam => (
                  <CameraCard key={cam.id} camera={cam} clipCount={clipCounts[cam.id] ?? 0} onSelect={onSelectCamera} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
