import { createContext, useContext, useState } from 'react'

const INITIAL_NOTIFICATIONS = []

const AppContext = createContext({})

export const useApp = () => useContext(AppContext)

export function AppProvider({ children }) {
  const [compact, setCompact] = useState(false)
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)

  function markRead(id) {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, unread: false } : n))
  }

  function markAllRead() {
    setNotifications(ns => ns.map(n => ({ ...n, unread: false })))
  }

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <AppContext.Provider value={{ compact, setCompact, notifications, markRead, markAllRead, unreadCount }}>
      {children}
    </AppContext.Provider>
  )
}
