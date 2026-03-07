import styles from './LeftRail.module.css'
import { IconHome, IconGallery, IconBell, IconPlus, IconSearch } from './icons'
import logo from './assets/tailCamLogo.svg'

const ITEMS = [
  { id: 'home',    Icon: IconHome    },
  { id: 'gallery', Icon: IconGallery },
  { id: 'alerts',  Icon: IconBell    },
  { id: 'add',     Icon: IconPlus    },
  { id: 'search',  Icon: IconSearch  },
]

export default function LeftRail({ active, setActive }) {
  return (
    <aside className={styles.rail}>
      <div className={styles.logo}><img src={logo} alt="Tailwatch" className={styles.logoImg} /></div>
      <div className={styles.top}>
        {ITEMS.map(({ id, Icon }) => (
          <button
            key={id}
            className={`${styles.btn} ${active === id ? styles.btnActive : ''}`}
            onClick={() => setActive(id)}
            title={id}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>
      <div className={styles.bottom}>
        <div className={styles.avatar}>AV</div>
      </div>
    </aside>
  )
}
