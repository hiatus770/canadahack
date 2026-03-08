import { useRef, useEffect, useState } from 'react'
import { IconSortLines, IconChevronDown } from './icons'
import styles from './SortDropdown.module.css'

const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'modified', label: 'Modified' },
  { key: 'size', label: 'Size' },
]

export default function SortDropdown({ sort, setSort }) {
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

  function select(key) {
    if (sort.key === key) {
      setSort(s => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))
    } else {
      setSort({ key, dir: 'asc' })
    }
    setOpen(false)
  }

  const current = SORT_OPTIONS.find(o => o.key === sort.key)

  return (
    <div ref={ref} className={styles.wrap}>
      <button className={styles.btn} onClick={() => setOpen(v => !v)}>
        <IconSortLines />
        {current.label}
        <span className={`${styles.dir} ${sort.dir === 'desc' ? styles.dirDesc : ''}`}>
          <IconChevronDown />
        </span>
      </button>
      {open && (
        <div className={styles.dropdown}>
          {SORT_OPTIONS.map(o => (
            <button
              key={o.key}
              className={`${styles.option} ${sort.key === o.key ? styles.optionActive : ''}`}
              onClick={() => select(o.key)}
            >
              {o.label}
              {sort.key === o.key && (
                <span className={`${styles.check} ${sort.dir === 'desc' ? styles.checkDesc : ''}`}>
                  <IconChevronDown />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function useSortedFiles(files, sort) {
  return [...files].sort((a, b) => {
    let cmp
    switch (sort.key) {
      case 'modified':
        cmp = new Date(a.modified || 0) - new Date(b.modified || 0)
        break
      case 'size':
        cmp = (a.size || 0) - (b.size || 0)
        break
      case 'type':
        cmp = (a.kind || '').localeCompare(b.kind || '')
        break
      default:
        cmp = a.name.localeCompare(b.name)
    }
    return sort.dir === 'asc' ? cmp : -cmp
  })
}

export function useSort(defaultKey = 'name') {
  const [sort, setSort] = useState({ key: defaultKey, dir: 'asc' })
  return { sort, setSort }
}
