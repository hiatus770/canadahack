import styles from './HeaderDropdowns.module.css'
import { useApp } from '../context/AppContext'

const ICON_COLORS = {
  folder:  'var(--blue-400)',
  upload:  'var(--green-400)',
  comment: 'var(--purple-400)',
  share:   'var(--orange-400)',
  info:    'var(--gray-400)',
  warning: '#BB5504',
  error:   '#B22D30',
}

// ── Reusable shell ────────────────────────────────────────────────────────────

function Dropdown({ className = '', children }) {
  return <div className={`${styles.dropdown} ${className}`}>{children}</div>
}

function DropHeader({ title, action }) {
  return (
    <div className={styles.dropHeader}>
      <span className={styles.dropTitle}>{title}</span>
      {action && <button className={styles.dropAction} onClick={action.onClick}>{action.label}</button>}
    </div>
  )
}

function DropDivider() {
  return <div className={styles.dropDivider} />
}

function DropItem({ icon, label, sub, onClick, danger }) {
  return (
    <button className={`${styles.dropItem} ${danger ? styles.dropItemDanger : ''}`} onClick={onClick}>
      {icon && <span className={styles.dropItemIcon}>{icon}</span>}
      <span className={styles.dropItemText}>
        <span className={styles.dropItemLabel}>{label}</span>
        {sub && <span className={styles.dropItemSub}>{sub}</span>}
      </span>
    </button>
  )
}

// ── Bell / Notifications ──────────────────────────────────────────────────────

export function BellDropdown({ onClose }) {
  const { notifications, markRead, markAllRead } = useApp()

  return (
    <Dropdown className={styles.dropdownMd}>
      <DropHeader title="Notifications" action={notifications.length > 0 ? { label: 'Mark all read', onClick: markAllRead } : undefined} />
      {notifications.length === 0 ? (
        <div className={styles.notifEmpty}>No notifications yet</div>
      ) : (
        notifications.map(n => (
          <div
            key={n.id}
            className={`${styles.notifRow} ${n.unread ? styles.notifUnread : ''}`}
            onClick={() => markRead(n.id)}
          >
            <div className={styles.notifAvatar} style={{ background: ICON_COLORS[n.icon] || ICON_COLORS.info }}>
              {n.icon === 'folder' ? '📁' : n.icon === 'upload' ? '📤' : n.icon === 'comment' ? '💬' : n.icon === 'share' ? '🔗' : n.icon === 'error' ? '⚠' : 'ℹ'}
            </div>
            <div className={styles.notifBody}>
              <span className={styles.notifText}>{n.text}</span>
              <span className={styles.notifWhen}>{n.when}</span>
            </div>
            {n.unread && <div className={styles.unreadDot} />}
          </div>
        ))
      )}
      <DropDivider />
      <button className={styles.dropFooter} onClick={onClose}>Dismiss</button>
    </Dropdown>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function SettingsDropdown({ onClose }) {
  const { compact, setCompact } = useApp()

  return (
    <Dropdown className={styles.dropdownSm}>
      <DropHeader title="Settings" />
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <span className={styles.settingLabel}>Compact view</span>
          <span className={styles.settingDesc}>Smaller file cards and tighter spacing</span>
        </div>
        <button
          className={`${styles.toggle} ${compact ? styles.toggleOn : ''}`}
          onClick={() => setCompact(v => !v)}
        >
          <div className={styles.toggleThumb} />
        </button>
      </div>
      <div className={styles.settingRow} style={{ opacity: 0.4 }}>
        <div className={styles.settingInfo}>
          <span className={styles.settingLabel}>Dark mode</span>
          <span className={styles.settingDesc}>Coming soon</span>
        </div>
        <button className={styles.toggle} disabled>
          <div className={styles.toggleThumb} />
        </button>
      </div>
      <DropDivider />
      <DropItem label="Tailnet settings" onClick={onClose} icon={
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M12.95 3.05l-1.42 1.42M4.47 11.53l-1.42 1.42" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      } />
    </Dropdown>
  )
}

// ── Help ──────────────────────────────────────────────────────────────────────

export function HelpDropdown({ onClose }) {
  return (
    <Dropdown className={styles.dropdownSm}>
      <DropHeader title="Help" />
      <DropItem onClick={onClose} label="Documentation" icon={
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      } />
      <DropItem onClick={onClose} label="Keyboard shortcuts" sub="⌘ /" icon={
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="4" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="9" y="4" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="5.5" y="10" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/>
        </svg>
      } />
      <DropItem onClick={onClose} label="What's new" icon={
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2l1.5 3.5L13 6l-2.5 2.5.5 3.5L8 10.5 5 12l.5-3.5L3 6l3.5-.5L8 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        </svg>
      } />
      <DropDivider />
      <DropItem onClick={onClose} label="Report a bug" icon={
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M8 5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
        </svg>
      } />
    </Dropdown>
  )
}

// ── Avatar / Profile ──────────────────────────────────────────────────────────

export function AvatarDropdown({ onClose, userInfo }) {
  const displayName = userInfo?.displayName || 'Unknown'
  const loginName = userInfo?.loginName || ''
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <Dropdown className={styles.dropdownSm}>
      <div className={styles.profileRow}>
        <div className={styles.profileAvatar}>{initials}</div>
        <div>
          <div className={styles.profileName}>{displayName}</div>
          <div className={styles.profileEmail}>{loginName}</div>
        </div>
      </div>
      <DropDivider />
      <DropItem onClick={onClose} label="Account settings" icon={
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M3 13.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      } />
      <DropDivider />
      <DropItem onClick={onClose} label="Sign out" danger icon={
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M10.5 10.5L13 8l-2.5-2.5M13 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      } />
    </Dropdown>
  )
}
