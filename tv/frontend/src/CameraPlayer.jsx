import { useState } from 'react'
import styles from './CameraPlayer.module.css'
import {
  IconChevronLeft, IconChevronRight, IconChevronDown,
  IconPlay, IconPause, IconSkipBack, IconSkipForward,
  IconRewind, IconFastForward, IconVolume, IconFullscreen,
  IconCloud, IconDownload, IconZoomIn, IconZoomOut,
  IconMic, IconCamera,
} from './icons'
import { CAMERAS, CLIP_TIMES } from './data'

export default function CameraPlayer({ camera, onBack }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(30)
  const [activeClip, setActiveClip] = useState(2)

  const camIndex = CAMERAS.findIndex(c => c.id === camera.id)
  const prevCam = CAMERAS[camIndex - 1] ?? null
  const nextCam = CAMERAS[camIndex + 1] ?? null

  const [c1, c2] = camera.gradient

  return (
    <div className={styles.wrapper}>
      {/* Scrollable */}
      <div className={styles.scrollArea}>
      <div className={styles.cardOuter}>
        {/* Tab bar */}
        <div className={styles.tabBar}>
          <div className={styles.tabs}>
            {['All Events', 'Doorbell Call', 'Intelligent Detection'].map((t, i) => (
              <button key={t} className={`${styles.tab} ${i === 0 ? styles.tabActive : ''}`}>{t}</button>
            ))}
          </div>
        </div>

        {/* Nav row */}
        <div className={styles.navRow}>
          <button className={styles.backBtn} onClick={onBack}>
            <IconChevronLeft size={14} /> Home
          </button>
          <div className={styles.navRight}>
            <button className={styles.navBtn} disabled={!nextCam} onClick={() => nextCam && onBack()}>
              Next Device <IconChevronRight size={14} />
            </button>
          </div>
        </div>
        <div className={styles.cardInner}>
        {/* Main video */}
        <div
          className={styles.video}
          style={{ background: `linear-gradient(160deg, ${c1} 0%, ${c2} 100%)` }}
        >
          <div className={styles.scanlines} />

          {/* Top-left: signal icons */}
          <div className={styles.videoTopLeft}>
            <span className={styles.sigIcon}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1.5 5.5C3.7 3.4 6.2 2.5 7 2.5s3.3.9 5.5 3" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M3.5 7.5C4.8 6.3 5.9 5.7 7 5.7s2.2.6 3.5 1.8" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M5.5 9.5C6.1 9 6.6 8.8 7 8.8s.9.2 1.5.7" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                <circle cx="7" cy="11.5" r="0.8" fill="white"/>
              </svg>
            </span>
            <span className={styles.sigIcon}>
              <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
                <rect x="0.75" y="0.75" width="16" height="10.5" rx="2" stroke="white" strokeWidth="1.2"/>
                <path d="M17.5 4v4" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                <rect x="2.5" y="2.5" width="10" height="7" rx="1" fill="white" opacity="0.7"/>
              </svg>
            </span>
          </div>

          {/* Top-right controls */}
          <div className={styles.videoTopRight}>
            {[IconMic, IconCamera, IconCamera].map((Icon, i) => (
              <button key={i} className={styles.videoBtn}><Icon size={15} /></button>
            ))}
          </div>

          {/* Bottom overlay: info + progress + controls */}
          <div className={styles.bottomOverlay}>
            <div className={styles.videoInfo}>
              <div className={styles.videoName}>{camera.location}: {camera.name}</div>
              <div className={styles.videoDate}>{camera.date}   {camera.lastSeen}</div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={e => setProgress(Number(e.target.value))}
              className={styles.progressBar}
            />
            <div className={styles.controls}>
              <div className={styles.ctrlLeft}>
                <button className={styles.ctrlBtn}><IconVolume size={16} /></button>
                <span className={styles.ctrlTime}>01:03 / 02:08</span>
              </div>
              <div className={styles.ctrlCenter}>
                <button className={styles.ctrlBtn}><IconSkipBack size={16} /></button>
                <button className={styles.ctrlBtn}><IconRewind size={16} /></button>
                <button className={`${styles.ctrlBtn} ${styles.ctrlPlay}`} onClick={() => setPlaying(v => !v)}>
                  {playing ? <IconPause size={18} /> : <IconPlay size={18} />}
                </button>
                <button className={styles.ctrlBtn}><IconFastForward size={16} /></button>
                <button className={styles.ctrlBtn}><IconSkipForward size={16} /></button>
              </div>
              <div className={styles.ctrlRight}>
                <button className={styles.liveBtn}>Live Video</button>
                <button className={styles.ctrlBtn}><IconCamera size={15} /></button>
                <button className={styles.ctrlBtn}><IconFullscreen size={15} /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className={styles.timeline}>
          <div className={styles.timelineHeader}>
            <button className={styles.todayBtn}>Today <IconChevronDown size={12} /></button>
            <div className={styles.timelineActions}>
              <button className={styles.timelineBtn}><IconCloud size={15} /></button>
              <button className={styles.timelineBtn}><IconDownload size={15} /></button>
            </div>
          </div>

          {/* Clips strip */}
          <div className={styles.clipsStrip}>
            {/* Time labels */}
            <div className={styles.timeLabels}>
              {CLIP_TIMES.map((t, i) => (
                <div key={i} className={styles.timeLabel}>{t}</div>
              ))}
            </div>
            {/* Clip thumbnails */}
            <div className={styles.clips}>
              {CLIP_TIMES.map((t, i) => (
                <div
                  key={i}
                  className={`${styles.clipGroup} ${activeClip === i ? styles.clipGroupActive : ''}`}
                  onClick={() => setActiveClip(i)}
                >
                  <div
                    className={styles.clipThumb}
                    style={{ background: `linear-gradient(160deg, ${camera.gradient[0]}, ${camera.gradient[1]})` }}
                  />
                  <span className={styles.clipCount}>{[2,3,null,4,4][i] ? `${[2,3,1,4,4][i]} clips` : ''}</span>
                  {activeClip === i && (
                    <div className={styles.clipPopup}>
                      <div className={styles.clipPopupTime}>{t}</div>
                      <div
                        className={styles.clipPopupThumb}
                        style={{ background: `linear-gradient(160deg, ${camera.gradient[0]}, ${camera.gradient[1]})` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Playhead */}
            <div className={styles.playhead} style={{ left: `${progress}%` }} />
          </div>

          {/* Zoom */}
          <div className={styles.zoom}>
            <button className={styles.timelineBtn}><IconZoomOut size={15} /></button>
            <div className={styles.zoomTrack}>
              <div className={styles.zoomThumb} style={{ left: '30%' }} />
            </div>
            <button className={styles.timelineBtn}><IconZoomIn size={15} /></button>
          </div>
        </div>
        </div>{/* cardInner */}
      </div>{/* cardOuter */}
      </div>{/* scrollArea */}
    </div>
  )
}
