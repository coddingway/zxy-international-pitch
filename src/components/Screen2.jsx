import Globe from './Globe.jsx'
import Nav from './Nav.jsx'
import styles from './Screen2.module.css'
import globeHalo from '../assets/globe-halo.svg'

export default function Screen2() {
  return (
    <div className={styles.root}>
      {/* image 32 — aerial field, cropped square */}
      <img src="/field-top.png" alt="" className={styles.field} />

      {/* Clouds drift above the field. Cloud 3 reuses Cloud 1's bitmap (as in Figma). */}
      <img src="/cloud-1.png" alt="" className={`${styles.cloud} ${styles.cloud1}`} />
      <img src="/cloud-2.png" alt="" className={`${styles.cloud} ${styles.cloud2}`} />
      <img src="/cloud-1.png" alt="" className={`${styles.cloud} ${styles.cloud3}`} />

      <Nav />

      {/* Group 24 — the Screen 1 globe, shrunk. Spins forever, no input. */}
      <div className={styles.globeBadge}>
        <img src={globeHalo} alt="" className={styles.globeHalo} />
        <div className={styles.globeInner}>
          <Globe size={67} interactive={false} />
        </div>
      </div>
    </div>
  )
}
