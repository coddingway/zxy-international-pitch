import GlobeBadge from './GlobeBadge.jsx'
import Nav from './Nav.jsx'
import styles from './Screen2.module.css'

export default function Screen2({ onBack }) {
  return (
    <div className={styles.root}>
      {/* image 32 — aerial field, cropped square */}
      <img src="/field-top.png" alt="" className={styles.field} />

      {/* Clouds drift above the field. Cloud 3 reuses Cloud 1's bitmap (as in Figma). */}
      <img src="/cloud-1.png" alt="" className={`${styles.cloud} ${styles.cloud1}`} />
      <img src="/cloud-2.png" alt="" className={`${styles.cloud} ${styles.cloud2}`} />
      <img src="/cloud-1.png" alt="" className={`${styles.cloud} ${styles.cloud3}`} />

      <Nav />

      <GlobeBadge onClick={onBack} />
    </div>
  )
}
