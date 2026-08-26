import Globe from './Globe.jsx'
import Nav from './Nav.jsx'
import styles from './Screen1.module.css'

export default function Screen1({ onAnchorClick }) {
  return (
    <div className={styles.root}>
      {/* Star field — fixed 2×2 tile */}
      <div className={styles.stars} />

      {/* Globe — centered */}
      <div className={styles.globeWrap}>
        <Globe size={648} onAnchorClick={onAnchorClick} />
      </div>

      <Nav />
    </div>
  )
}
