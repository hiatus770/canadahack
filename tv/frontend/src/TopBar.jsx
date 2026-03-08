import { useState, useRef, useEffect } from 'react'
import styles from './TopBar.module.css'
import logo from './assets/tailCamLogo.svg'
import { whoami } from './api'

export default function TopBar() {
  const [open, setOpen] = useState(false)
  const [userInfo, setUserInfo] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    whoami().then(setUserInfo).catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const displayName = userInfo?.displayName || 'Unknown'
  const loginName = userInfo?.loginName || ''
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <img src={logo} alt="TailTV" className={styles.brandLogo} />
        <span className={styles.brandName}>tailtv</span>
      </div>

      <div className={styles.headerActions}>
        <div ref={ref} className={styles.dropWrap}>
          <button
            className={`${styles.userAvatar} ${open ? styles.userAvatarActive : ''}`}
            onClick={() => setOpen(v => !v)}
            title="Account"
          >
            {initials}
          </button>
          {open && (
            <div className={styles.dropdown}>
              <div className={styles.profileRow}>
                <div className={styles.profileAvatar}>{initials}</div>
                <div>
                  <div className={styles.profileName}>{displayName}</div>
                  <div className={styles.profileEmail}>{loginName}</div>
                </div>
              </div>
              <div className={styles.dropDivider} />
              <button className={styles.dropItem} onClick={() => setOpen(false)}>
                <span className={styles.dropItemIcon}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M3 13.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </span>
                Account settings
              </button>
              <div className={styles.dropDivider} />
              <button className={`${styles.dropItem} ${styles.dropItemDanger}`} onClick={() => setOpen(false)}>
                <span className={styles.dropItemIcon}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    <path d="M10.5 10.5L13 8l-2.5-2.5M13 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
