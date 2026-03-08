import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './CameraPlayer.module.css'
import {
  IconChevronLeft, IconChevronRight,
  IconPlay, IconPause, IconSkipBack, IconSkipForward,
  IconRewind, IconFastForward, IconVolume, IconFullscreen,
  IconMic, IconCamera,
} from './icons'
import { getStreamUrl, getClipDownloadUrl } from './api'

function fmtTime(s) {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = String(Math.floor(s % 60)).padStart(2, '0')
  return `${m}:${sec}`
}

export default function CameraPlayer({ camera, cameras = [], selectedClip, onClearClip, onBack }) {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [muted, setMuted] = useState(true)
  const isLive = !selectedClip
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Reset controls when clip changes
  useEffect(() => {
    setPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    setDuration(0)
  }, [selectedClip])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v || !v.duration) return
    setCurrentTime(v.currentTime)
    setProgress((v.currentTime / v.duration) * 100)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    setDuration(v.duration)
  }, [])

  const handleSeek = useCallback((e) => {
    const v = videoRef.current
    if (!v || !v.duration) return
    const pct = Number(e.target.value)
    v.currentTime = (pct / 100) * v.duration
    setProgress(pct)
  }, [])

  const skipBy = useCallback((secs) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + secs))
  }, [])

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }, [])

  const formatClock = (d) => {
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const h = d.getHours()
    const min = String(d.getMinutes()).padStart(2, '0')
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = String(h % 12 || 12).padStart(2, '0')
    return { date: `${dd}-${mm}-${yyyy}`, time: `${h12}:${min} ${ampm}` }
  }
  const clock = formatClock(now)

  const camIndex = cameras.findIndex(c => c.id === camera.id)
  const prevCam = cameras[camIndex - 1] ?? null
  const nextCam = cameras[camIndex + 1] ?? null

  const [c1, c2] = camera.gradient

  return (
    <div className={styles.wrapper}>
      <div className={styles.scrollArea}>
      <div className={styles.cardOuter}>
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

        {/* Main video */}
        <div
          className={styles.video}
          style={{ background: `linear-gradient(160deg, ${c1} 0%, ${c2} 100%)` }}
        >
          {/* Live MJPEG stream — always in DOM to keep cam connection alive */}
          <img
            src={getStreamUrl(camera.id, { fps: 8, quality: 60 })}
            alt={camera.name}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', zIndex: 0, borderRadius: 'inherit',
              opacity: isLive ? 1 : 0,
            }}
          />
          {/* Clip playback */}
          {!isLive && (
            <video
              ref={videoRef}
              key={selectedClip.id}
              src={getClipDownloadUrl(camera.id, selectedClip.id)}
              autoPlay
              muted={muted}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, borderRadius: 'inherit' }}
            />
          )}
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
              <div className={styles.videoName}>
                {camera.location}: {camera.name}
                {isLive && <span className={styles.livePill}>LIVE</span>}
              </div>
              <div className={styles.videoDate}>
                {(() => {
                  const c = isLive ? clock : formatClock(new Date(selectedClip.timestamp))
                  return <>{c.date}<span style={{margin: '0 8px'}}/>{c.time}</>
                })()}
              </div>
            </div>
            {!isLive && (
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleSeek}
                className={styles.progressBar}
              />
            )}
            <div className={styles.controls}>
              {isLive ? (
                <div className={styles.ctrlRight} style={{ flex: 1 }}>
                  <button className={`${styles.liveBtn} ${styles.liveBtnActive}`} onClick={onClearClip}>Live Video</button>
                  <button className={styles.ctrlBtn}><IconCamera size={15} /></button>
                  <button className={styles.ctrlBtn}><IconFullscreen size={15} /></button>
                </div>
              ) : (
                <>
                  <div className={styles.ctrlLeft}>
                    <button className={styles.ctrlBtn} onClick={toggleMute}>
                      <IconVolume size={16} style={muted ? { opacity: 0.4 } : {}} />
                    </button>
                    <span className={styles.ctrlTime}>{fmtTime(currentTime)} / {fmtTime(duration)}</span>
                  </div>
                  <div className={styles.ctrlCenter}>
                    <button className={styles.ctrlBtn} onClick={() => skipBy(-30)}><IconSkipBack size={16} /></button>
                    <button className={styles.ctrlBtn} onClick={() => skipBy(-10)}><IconRewind size={16} /></button>
                    <button className={`${styles.ctrlBtn} ${styles.ctrlPlay}`} onClick={togglePlay}>
                      {playing ? <IconPause size={18} /> : <IconPlay size={18} />}
                    </button>
                    <button className={styles.ctrlBtn} onClick={() => skipBy(10)}><IconFastForward size={16} /></button>
                    <button className={styles.ctrlBtn} onClick={() => skipBy(30)}><IconSkipForward size={16} /></button>
                  </div>
                  <div className={styles.ctrlRight}>
                    <button className={styles.liveBtn} onClick={onClearClip}>Live Video</button>
                    <button className={styles.ctrlBtn}><IconCamera size={15} /></button>
                    <button className={styles.ctrlBtn}><IconFullscreen size={15} /></button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>{/* cardOuter */}
      </div>{/* scrollArea */}
    </div>
  )
}
