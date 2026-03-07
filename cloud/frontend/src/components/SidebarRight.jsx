import { useState } from 'react'
import styles from './SidebarRight.module.css'
import { useApp } from '../context/AppContext'
import { IconInfo, IconActivity, IconLayout, IconSettingsSm } from './icons'
import { AVATARS } from '../data/content'

const ACTIVITY = [
  { user: 'JD', action: 'shared infra-diagram.pdf with you',   when: '5 min ago' },
  { user: 'MK', action: 'mentioned you in node-inventory.csv', when: '2 hr ago'  },
  { user: 'TC', action: 'added you to Deployment Scripts',     when: '3 hr ago'  },
  { user: 'AL', action: 'shared network-topology.pdf',         when: 'Yesterday' },
]

function InfoPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Details</div>
      <div className={styles.panelSection}>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Status</span>
          <span className={styles.statValue} style={{ color: 'var(--green-400)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className={styles.connDot} />Connected
          </span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Tailnet</span>
          <span className={styles.statValue}>tailscale.com</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Devices</span>
          <span className={styles.statValue}>3 online</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Storage</span>
          <span className={styles.statValue}>2.4 / 20 GB</span>
        </div>
      </div>
      <div className={styles.panelHint}>Select a file to see its details.</div>
    </div>
  )
}

function ActivityPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Activity</div>
      {ACTIVITY.map((a, i) => {
        const av = AVATARS[a.user]
        return (
          <div key={i} className={styles.activityRow}>
            <div className={styles.activityAvatar} style={{ background: av?.bg }}>
              {a.user}
            </div>
            <div className={styles.activityBody}>
              <span className={styles.activityText}><b>{a.user}</b> {a.action}</span>
              <span className={styles.activityWhen}>{a.when}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LayoutPanel() {
  const { compact, setCompact } = useApp()
  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>View options</div>
      <div className={styles.layoutSection}>
        <div className={styles.layoutLabel}>Density</div>
        <button
          className={`${styles.layoutOption} ${!compact ? styles.layoutOptionActive : ''}`}
          onClick={() => setCompact(false)}
        >
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
            <rect x="1" y="1" width="11" height="8" rx="2" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="16" y="1" width="11" height="8" rx="2" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="1" y="11" width="11" height="8" rx="2" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="16" y="11" width="11" height="8" rx="2" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
          <span>Comfortable</span>
        </button>
        <button
          className={`${styles.layoutOption} ${compact ? styles.layoutOptionActive : ''}`}
          onClick={() => setCompact(true)}
        >
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
            <rect x="1" y="1" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="11" y="1" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="21" y="1" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="1" y="8" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="11" y="8" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="21" y="8" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="1" y="15" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="11" y="15" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="21" y="15" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
          <span>Compact</span>
        </button>
      </div>
    </div>
  )
}

const PANELS = { info: InfoPanel, activity: ActivityPanel, layout: LayoutPanel }

const BUTTONS = [
  { id: 'info',     Icon: IconInfo,     title: 'Details'      },
  { id: 'activity', Icon: IconActivity, title: 'Activity'     },
  { id: 'layout',   Icon: IconLayout,   title: 'View options' },
]

export default function SidebarRight() {
  const [active, setActive] = useState(null)

  const Panel = active ? PANELS[active] : null

  return (
    <aside className={`${styles.sidebar} ${Panel ? styles.sidebarExpanded : ''}`}>
      {Panel && <Panel />}
      <div className={styles.rail}>
        {BUTTONS.map(({ id, Icon, title }) => (
          <button
            key={id}
            className={`${styles.btn} ${active === id ? styles.btnActive : ''}`}
            title={title}
            onClick={() => setActive(v => v === id ? null : id)}
          >
            <Icon size={18} />
          </button>
        ))}
        <div className={styles.spacer} />
        <button className={styles.btn} title="Settings">
          <IconSettingsSm />
        </button>
      </div>
    </aside>
  )
}
