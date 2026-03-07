import { useState, useEffect, useCallback } from 'react'
import styles from './App.module.css'
import LeftRail from './LeftRail'
import FeedPanel from './FeedPanel'
import CameraGrid from './CameraGrid'
import CameraPlayer from './CameraPlayer'
import { fetchCameras, fetchAlerts, connectAlertWS } from './api'

export default function App() {
  const [railActive, setRailActive] = useState('home')
  const [activeTab, setActiveTab] = useState('All')
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [selectedClip, setSelectedClip] = useState(null)
  const [cameras, setCameras] = useState([])
  const [alerts, setAlerts] = useState([])

  // Fetch cameras every 10s
  const loadCameras = useCallback(async () => {
    const cams = await fetchCameras()
    // Add gradient fallbacks for UI compatibility
    const gradients = [
      ['#2a3a1a','#1a2810'], ['#1e2a18','#141e10'], ['#162814','#0e1e0c'],
      ['#1a2c14','#102010'], ['#1e2618','#141c10'], ['#1c2416','#12180e'],
      ['#1a1e2e','#10121e'], ['#16182a','#0e1020'], ['#2a1e14','#1e1410'],
      ['#261a12','#1c120e'], ['#1e1c28','#14121e'],
    ]
    setCameras(cams.map((c, i) => ({
      ...c,
      gradient: c.gradient || gradients[i % gradients.length],
      lastSeen: c.last_seen ? new Date(c.last_seen).toLocaleTimeString() : '',
      date: c.last_seen ? new Date(c.last_seen).toLocaleDateString() : '',
    })))
  }, [])

  const loadAlerts = useCallback(async () => {
    const a = await fetchAlerts(50)
    setAlerts(a)
  }, [])

  useEffect(() => {
    loadCameras()
    loadAlerts()
    const interval = setInterval(() => { loadCameras(); loadAlerts() }, 10000)
    const cleanup = connectAlertWS(() => {
      // Re-fetch clips shortly after an alert so the saved clip ID is available
      setTimeout(loadAlerts, 5000)
    })
    return () => { clearInterval(interval); cleanup() }
  }, [loadCameras, loadAlerts])

  // Compute locations from live cameras
  const locations = ['All', ...new Set(cameras.map(c => c.location))]

  return (
    <div className={styles.root}>
    <div className={styles.shell}>
      <LeftRail active={railActive} setActive={setRailActive} />

      <div className={styles.middle}>
        {selectedCamera ? (
          <CameraPlayer
            camera={selectedCamera}
            cameras={cameras}
            selectedClip={selectedClip}
            onClearClip={() => setSelectedClip(null)}
            onBack={() => { setSelectedCamera(null); setSelectedClip(null) }}
          />
        ) : (
          <CameraGrid
            cameras={cameras}
            locations={locations}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onSelectCamera={setSelectedCamera}
          />
        )}
      </div>

      <FeedPanel
        alerts={alerts}
        onSelectClip={(clip) => {
          setSelectedClip(clip)
          if (cameras.length > 0) setSelectedCamera(prev => prev ?? cameras[0])
        }}
      />
    </div>
    </div>
  )
}
