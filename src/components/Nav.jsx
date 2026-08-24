import styles from './Nav.module.css'
import zxyLogo from '../assets/zxy-logo.svg'
import iconSearch from '../assets/icon-search.svg'
import iconBag from '../assets/icon-bag.svg'

const NAV_ITEMS = ['Our Group', 'Product & Services', 'Our Promise', 'Global Locations', 'Newsfeed']

export default function Nav() {
  return (
    <nav className={styles.nav}>
      <div className={styles.navLogo}>
        <img src={zxyLogo} alt="ZXY" width={42} height={42} />
      </div>
      <div className={styles.navLinks}>
        {NAV_ITEMS.map(item => (
          <a key={item} href="#" className={styles.navItem}>{item}</a>
        ))}
      </div>
      <button className={styles.navIcon}>
        <img src={iconSearch} alt="Search" width={20} height={20} />
      </button>
      <button className={styles.navIcon}>
        <img src={iconBag} alt="Bag" width={20} height={20} />
      </button>
    </nav>
  )
}
