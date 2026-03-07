import { createContext, useContext, useState } from 'react'

const INITIAL_NOTIFICATIONS = [
  { id: 1, user: 'JD', text: 'shared infra-diagram.pdf with you',   when: '5 min ago',  unread: true  },
  { id: 2, user: 'MK', text: 'mentioned you in node-inventory.csv', when: '2 hr ago',   unread: true  },
  { id: 3, user: 'TC', text: 'added you to Deployment Scripts',     when: '3 hr ago',   unread: false },
  { id: 4, user: 'AL', text: 'shared network-topology.pdf',         when: 'Yesterday',  unread: false },
]

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
