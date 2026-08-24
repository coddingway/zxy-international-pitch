import Globe from './Globe.jsx'
import styles from './GlobeBadge.module.css'
import globeHalo from '../assets/globe-halo.svg'

// Persistent corner badge for screens 2–6. The globe spins on its own and takes
// no input of its own — the whole badge is the button back to screen 1.
export default function GlobeBadge({ onClick }) {
  return (
    <button type="button" className={styles.badge} onClick={onClick} aria-label="Back to the globe">
      <img src={globeHalo} alt="" className={styles.halo} />
      <span className={styles.inner}>
        <Globe size={67} interactive={false} />
      </span>
    </button>
  )
}
