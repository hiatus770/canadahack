import { useState } from 'react'
import styles from './App.module.css'
import LeftRail from './LeftRail'
import FeedPanel from './FeedPanel'
import CameraGrid from './CameraGrid'
import CameraPlayer from './CameraPlayer'

export default function App() {
  const [railActive, setRailActive] = useState('home')
  const [activeTab, setActiveTab] = useState('All')
  const [selectedCamera, setSelectedCamera] = useState(null)

  return (
    <div className={styles.root}>
    <div className={styles.shell}>
      <LeftRail active={railActive} setActive={setRailActive} />

      <div className={styles.middle}>
        {selectedCamera ? (
          <CameraPlayer
            camera={selectedCamera}
            onBack={() => setSelectedCamera(null)}
          />
        ) : (
          <CameraGrid
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onSelectCamera={setSelectedCamera}
          />
        )}
      </div>

      <FeedPanel />
    </div>
    </div>
  )
}
