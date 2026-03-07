import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext({})

export const useApp = () => useContext(AppContext)

let nextId = 1

export function AppProvider({ children }) {
  const [compact, setCompact] = useState(false)
  const [notifications, setNotifications] = useState([])

  function markRead(id) {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, unread: false } : n))
  }

  function markAllRead() {
    setNotifications(ns => ns.map(n => ({ ...n, unread: false })))
  }

  const notify = useCallback((text, icon) => {
    const n = {
      id: nextId++,
      text,
      icon: icon || 'info',
      when: 'Just now',
      unread: true,
      timestamp: Date.now(),
    }
    setNotifications(prev => [n, ...prev])
  }, [])

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <AppContext.Provider value={{ compact, setCompact, notifications, markRead, markAllRead, unreadCount, notify }}>
      {children}
    </AppContext.Provider>
  )
}
