import styles from './Sidebar.module.css'
import { IconCamera, IconShield, IconBell, IconSettings, IconDiamond, IconNode } from './icons'
import { NODES } from './data'

const NAV = [
  { id: 'cameras',  label: 'Cameras',   Icon: IconCamera  },
  { id: 'alerts',   label: 'Alerts',    Icon: IconBell    },
  { id: 'security', label: 'Security',  Icon: IconShield  },
  { id: 'nodes',    label: 'Nodes',     Icon: IconNode    },
]

export default function Sidebar({ active, setActive, alertCount }) {
  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.brandIcon}><IconDiamond size={16} /></div>
        <div>
          <div className={styles.brandName}>Tailwatch</div>
          <div className={styles.brandSub}>Security</div>
        </div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`${styles.navItem} ${active === id ? styles.navItemActive : ''}`}
            onClick={() => setActive(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
            {id === 'alerts' && alertCount > 0 && (
              <span className={styles.badge}>{alertCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className={styles.spacer} />

      {/* Tailnet nodes mini-status */}
      <div className={styles.nodesBox}>
        <div className={styles.nodesLabel}>Tailnet Nodes</div>
        {NODES.map(n => (
          <div key={n.name} className={styles.nodeRow}>
            <div className={`${styles.nodeDot} ${n.online ? styles.nodeDotOn : styles.nodeDotOff}`} />
            <span className={styles.nodeName}>{n.name}</span>
            <span className={styles.nodeCams}>{n.cameras} cam{n.cameras !== 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>

      {/* Settings */}
      <button className={styles.settingsBtn}>
        <IconSettings size={18} />
        <span>Settings</span>
      </button>
    </aside>
  )
}
