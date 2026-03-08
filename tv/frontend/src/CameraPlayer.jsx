import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './CameraPlayer.module.css'
import {
  IconChevronLeft, IconChevronRight,
  IconPlay, IconPause, IconSkipBack, IconSkipForward,
  IconVolume, IconFullscreen, IconWifi, IconBattery,
  IconVolumeOff, IconSkip1Back, IconSkip1Forward,
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
  const videoContainerRef = useRef(null)
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

  // React's `muted` prop doesn't update the DOM property on re-renders (known React bug),
  // so we sync it directly via useEffect.
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted
    }
  }, [muted])

  const toggleFullscreen = useCallback(() => {
    const el = videoContainerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  const toggleMute = useCallback(() => {
    setMuted(m => !m)
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
          ref={videoContainerRef}
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
            <IconWifi size={13} level={camera.wifi ?? 100} />
            <span className={styles.statDivider} />
            <IconBattery size={15} level={camera.battery ?? 100} />
            <span className={styles.statPct}>{camera.battery ?? 100}%</span>
          </div>

          {/* Bottom overlay: info + progress + controls */}
          <div className={styles.bottomOverlay}>
            {isLive ? (
              <div className={styles.liveBottom}>
                <div className={styles.videoInfo}>
                  <div className={styles.videoName}>
                    {camera.location}: {camera.name}
                    <span className={styles.livePill}>LIVE</span>
                  </div>
                  <div className={styles.videoDate}>
                    {clock.date}<span style={{margin: '0 8px'}}/>{clock.time}
                  </div>
                </div>
                <button className={styles.ctrlBtn} onClick={toggleFullscreen}><IconFullscreen size={15} /></button>
              </div>
            ) : (
              <>
                <div className={styles.videoInfo}>
                  <div className={styles.videoName}>{camera.location}: {camera.name}</div>
                  <div className={styles.videoDate}>
                    {(() => {
                      const c = formatClock(new Date(selectedClip.timestamp))
                      return <>{c.date}<span style={{margin: '0 8px'}}/>{c.time}</>
                    })()}
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSeek}
                  className={styles.progressBar}
                />
                <div className={styles.controls}>
                  <div className={styles.ctrlLeft}>
                    <button className={styles.ctrlBtn} onClick={toggleMute}>
                      {muted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
                    </button>
                    <span className={styles.ctrlTime}>{fmtTime(currentTime)} / {fmtTime(duration)}</span>
                  </div>
                  <div className={styles.ctrlCenter}>
                    <button className={styles.ctrlBtn} onClick={() => skipBy(-30)}><IconSkipBack size={16} /></button>
                    <button className={styles.ctrlBtn} onClick={() => skipBy(-1)}><IconSkip1Back size={20} /></button>
                    <button className={`${styles.ctrlBtn} ${styles.ctrlPlay}`} onClick={togglePlay}>
                      {playing ? <IconPause size={18} /> : <IconPlay size={18} />}
                    </button>
                    <button className={styles.ctrlBtn} onClick={() => skipBy(1)}><IconSkip1Forward size={20} /></button>
                    <button className={styles.ctrlBtn} onClick={() => skipBy(30)}><IconSkipForward size={16} /></button>
                  </div>
                  <div className={styles.ctrlRight}>
                    <button className={styles.liveBtn} onClick={onClearClip}>Live Video</button>
                    <button className={styles.ctrlBtn} onClick={toggleFullscreen}><IconFullscreen size={15} /></button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>{/* cardOuter */}
      </div>{/* scrollArea */}
    </div>
  )
}
