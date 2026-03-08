export function IconHome({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M3 8.5L10 2l7 6.5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7 18v-6h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconGallery({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

export function IconBell({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 2a6 6 0 0 0-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 0 0-6-6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M8.5 16.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconTrash({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M3 5h14M8 5V3h4v2M5 5l1 12h8l1-12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconPlus({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconSearch({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconFilter({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

export function IconMenu({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="3" r="1" fill="currentColor"/>
      <circle cx="8" cy="8" r="1" fill="currentColor"/>
      <circle cx="8" cy="13" r="1" fill="currentColor"/>
    </svg>
  )
}

export function IconMore({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="3" cy="8" r="1.2" fill="currentColor"/>
      <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
      <circle cx="13" cy="8" r="1.2" fill="currentColor"/>
    </svg>
  )
}

export function IconWifi({ size = 14, level = 100 }) {
  // level: 0-100
  const hi = level > 60
  const mid = level > 30
  const dim = 'rgba(255,255,255,0.25)'
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M1.5 5.5C3.7 3.4 6.2 2.5 7 2.5s3.3.9 5.5 3" stroke={hi ? 'currentColor' : dim} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M3.5 7.5C4.8 6.3 5.9 5.7 7 5.7s2.2.6 3.5 1.8" stroke={mid ? 'currentColor' : dim} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M5.5 9.5C6.1 9 6.6 8.8 7 8.8s.9.2 1.5.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="7" cy="11.5" r="0.8" fill="currentColor"/>
    </svg>
  )
}

export function IconBattery({ size = 16, level = 100 }) {
  // fill width maps level 0-100 to 0-8px inside the battery body
  const fillW = Math.max(0, Math.round((level / 100) * 8))
  const fillColor = level <= 20 ? '#ff4444' : level <= 50 ? '#ffaa00' : 'currentColor'
  return (
    <svg width={size} height={size} viewBox="0 0 16 10" fill="none">
      <rect x="0.75" y="0.75" width="12.5" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M14 3.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      {fillW > 0 && <rect x="2" y="2" width={fillW} height="6" rx="0.8" fill={fillColor} opacity="0.85"/>}
    </svg>
  )
}

export function IconPlay({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M5 3.5l10 5.5-10 5.5V3.5Z" fill="currentColor"/>
    </svg>
  )
}

export function IconPause({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <rect x="3" y="3" width="4" height="12" rx="1.5" fill="currentColor"/>
      <rect x="11" y="3" width="4" height="12" rx="1.5" fill="currentColor"/>
    </svg>
  )
}

export function IconSkipBack({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 3v10M13 3L6 8l7 5V3Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconSkipForward({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M13 3v10M3 3l7 5-7 5V3Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconRewind({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 8L2 4v8l6-4ZM14 8L8 4v8l6-4Z" fill="currentColor"/>
    </svg>
  )
}

export function IconFastForward({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 8l6-4v8l-6-4ZM2 8l6-4v8L2 8Z" fill="currentColor"/>
    </svg>
  )
}

export function IconVolume({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 6H1v4h2l4 3V3L3 6Z" fill="currentColor"/>
      <path d="M11 4.5a5 5 0 0 1 0 7M9 6.5a2.5 2.5 0 0 1 0 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconClip({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M1.5 5A1.5 1.5 0 0 1 3 3.5h1.2L5.2 2h3.6l1 1.5H11A1.5 1.5 0 0 1 12.5 5v5.5A1.5 1.5 0 0 1 11 12H3A1.5 1.5 0 0 1 1.5 10.5V5Z" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="7" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}

export function IconSkip1Forward({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 4a8 8 0 1 1-5.66 2.34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 4l2.5 2.5L12 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="12" y="15.5" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="currentColor" fontFamily="system-ui,sans-serif">1s</text>
    </svg>
  )
}

export function IconSkip1Back({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 4a8 8 0 1 0 5.66 2.34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 4l-2.5 2.5L12 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="12" y="15.5" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="currentColor" fontFamily="system-ui,sans-serif">1s</text>
    </svg>
  )
}

export function IconVolumeOff({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 6H1v4h2l4 3V3L3 6Z" fill="currentColor"/>
      <path d="M12 6l-3 3m0-3l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

export function IconFullscreen({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M10 2h4v4M6 14H2v-4M2 2l5 5M14 14l-5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconCloud({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M12 11a3 3 0 0 0-.5-5.9A5 5 0 1 0 4 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M6 13l2 2 2-2M8 15V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconDownload({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 2v8M5 7l3 3 3-3M2 13h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconCamera({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M1.5 5A1.5 1.5 0 0 1 3 3.5h1.5L6 2h4l1.5 1.5H13a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5V5Z" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}

export function IconMic({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="5.5" y="1.5" width="5" height="7" rx="2.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3 8a5 5 0 0 0 10 0M8 13v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconZoomIn({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 7h4M7 5v4M11 11l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconZoomOut({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 7h4M11 11l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconChevronLeft({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconChevronRight({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconChevronDown({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
