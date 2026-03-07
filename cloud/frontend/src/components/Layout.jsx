import { useRef, useEffect, useState, useCallback } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import styles from './Layout.module.css'
import NewDropdown from './NewDropdown'
import { BellDropdown, AvatarDropdown } from './HeaderDropdowns'
import { useSearch } from '../context/SearchContext'
import { useApp } from '../context/AppContext'
import {
  IconDiamond, IconSearch, IconBell,
  IconPlus, IconHome, IconPeople, IconClock,
  IconServer, IconTrash,
} from './icons'

const NAV_MAIN = [
  { label: 'My Drive',       to: '/drive',   Icon: IconHome,   matchPrefix: '/drive' },
  { label: 'Shared with me', to: '/shared',  Icon: IconPeople },
  { label: 'Recent',         to: '/recent',  Icon: IconClock  },
  { label: 'Trash',          to: '/trash',   Icon: IconTrash  },
]

const NAV_DRIVES = [
  { label: 'prod-server', to: '/machine/prod-server' },
  { label: 'dev-vm',      to: '/machine/dev-vm'      },
  { label: 'backup-nas',  to: '/machine/backup-nas'  },
]


function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return { open, setOpen, ref, toggle: () => setOpen(v => !v), close: () => setOpen(false) }
}

export default function Layout() {
  const { query, setQuery } = useSearch()
  const { unreadCount } = useApp()
  const newDD    = useDropdown()
  const bellDD   = useDropdown()
  const avatarDD = useDropdown()

  return (
    <div className={styles.app}>
      {/* ── HEADER ── */}
      <header className={styles.header}>
        <Link to="/drive" className={styles.brand}>
          <div className={styles.brandIcon}><IconDiamond /></div>
          <span className={styles.brandName}>
            Tailstorm <span className={styles.brandSub}>Drive</span>
          </span>
        </Link>

        <div className={styles.search}>
          <span className={styles.searchIcon}><IconSearch /></span>
          <input
            className={styles.searchInput}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search files across your tailnet..."
          />
          {query && (
            <button className={styles.searchClear} onClick={() => setQuery('')} title="Clear search">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        <div className={styles.headerActions}>
          {/* Bell */}
          <div ref={bellDD.ref} className={styles.dropWrap}>
            <button
              className={`${styles.iconBtn} ${bellDD.open ? styles.iconBtnActive : ''}`}
              title="Notifications"
              onClick={bellDD.toggle}
            >
              <IconBell />
              {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
            </button>
            {bellDD.open && <BellDropdown onClose={bellDD.close} />}
          </div>


          <div className={styles.headerDivider} />

          {/* Avatar */}
          <div ref={avatarDD.ref} className={styles.dropWrap}>
            <button
              className={`${styles.userAvatar} ${avatarDD.open ? styles.userAvatarActive : ''}`}
              onClick={avatarDD.toggle}
              title="Account"
            >
              MR
            </button>
            {avatarDD.open && <AvatarDropdown onClose={avatarDD.close} />}
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className={styles.body}>
        {/* ── LEFT SIDEBAR ── */}
        <aside className={styles.sidebarLeft}>
          <div ref={newDD.ref} className={styles.newWrap}>
            <button className={styles.newBtn} onClick={newDD.toggle}>
              <IconPlus /> New
            </button>
            {newDD.open && <NewDropdown onClose={newDD.close} />}
          </div>

          <nav className={styles.nav}>
            {NAV_MAIN.map(({ label, to, Icon, matchPrefix }) => (
              <NavLink
                key={to}
                to={to}
                end={!matchPrefix}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                <Icon />{label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.sectionLabel}>Tailnet Drives</div>
          <nav className={styles.nav} style={{ paddingTop: 0 }}>
            {NAV_DRIVES.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                <IconServer />{label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.sidebarSpacer} />
          <div className={styles.storageBox}>
            <div className={styles.storageLabel}>Storage</div>
            <div className={styles.storageBar}><div className={styles.storageFill} /></div>
            <div className={styles.storageUsed}>2.4 GB of 20 GB used</div>
            <button className={styles.storageUpgrade}>Get more storage</button>
          </div>
        </aside>

        {/* ── PAGE CONTENT ── */}
        <Outlet />

      </div>
    </div>
  )
}
