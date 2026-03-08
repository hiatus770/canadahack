import { useRef, useEffect, useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import styles from './Layout.module.css'
import NewDropdown from './NewDropdown'
import { BellDropdown, AvatarDropdown } from './HeaderDropdowns'
import { useSearch } from '../context/SearchContext'
import { useApp } from '../context/AppContext'
import { listMachines, getStorage, whoami } from '../api'
import {
  IconSearch, IconBell,
  IconPlus, IconHome, IconClock,
  IconServer, IconTrash, IconCamera,
} from './icons'
import tailCloudLogo from '../assets/tailCloudLogo.svg'

const NAV_MAIN = [
  { label: 'My Drive',       to: '/drive',   Icon: IconHome,   matchPrefix: '/drive' },
  { label: 'Recent',         to: '/recent',  Icon: IconClock  },
  { label: 'Trash',          to: '/trash',   Icon: IconTrash  },
  { label: 'Cameras',        to: '/cameras', Icon: IconCamera },
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

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function Layout() {
  const { query, setQuery } = useSearch()
  const { unreadCount } = useApp()
  const newDD    = useDropdown()
  const bellDD   = useDropdown()
  const avatarDD = useDropdown()
  const [machines, setMachines] = useState([])
  const [storage, setStorage] = useState(null)
  const [userInfo, setUserInfo] = useState(null)

  useEffect(() => {
    listMachines()
      .then(setMachines)
      .catch(err => console.error('Failed to load machines:', err))
    getStorage()
      .then(setStorage)
      .catch(err => console.error('Failed to load storage:', err))
    whoami()
      .then(setUserInfo)
      .catch(err => console.error('Failed to load user info:', err))
  }, [])

  const initials = userInfo?.displayName
    ? userInfo.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className={styles.app}>
      {/* ── HEADER ── */}
      <header className={styles.header}>
        <Link to="/drive" className={styles.brand}>
          <img src={tailCloudLogo} alt="TailCloud" className={styles.brandLogo} />
          <span className={styles.brandName}>
            tailcloud
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
              {initials}
            </button>
            {avatarDD.open && <AvatarDropdown onClose={avatarDD.close} userInfo={userInfo} />}
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
            {machines.length === 0 && (
              <span className={styles.navItem} style={{ opacity: 0.5, cursor: 'default' }}>
                Loading...
              </span>
            )}
            {machines.map(({ name }) => (
              <NavLink
                key={name}
                to={`/machine/${name}`}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                <IconServer />{name}
              </NavLink>
            ))}
          </nav>

          <div className={styles.sidebarSpacer} />
          <div className={styles.storageBox}>
            <div className={styles.storageLabel}>Storage</div>
            <div className={styles.storageBar}>
              <div className={styles.storageFill} style={{ width: storage ? `${Math.min(storage.percent, 100).toFixed(1)}%` : '0%' }} />
            </div>
            <div className={styles.storageUsed}>
              {storage ? `${formatBytes(storage.used)} of ${formatBytes(storage.total)} used` : 'Loading...'}
            </div>
          </div>
        </aside>

        {/* ── PAGE CONTENT ── */}
        <Outlet />

      </div>
    </div>
  )
}
