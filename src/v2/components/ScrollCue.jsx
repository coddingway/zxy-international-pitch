import styles from './ScrollCue.module.css'
import arrowDown from '../../assets/icon-arrow-down.svg'

// Bottom-centre scroll cue carried by screens 2–6 (Figma "Ellipse 5" + arrow).
// Presentational for now — no scroll behaviour is specified in the design yet.
export default function ScrollCue() {
  return (
    <div className={styles.cue} aria-hidden="true">
      <img src={arrowDown} alt="" width={24} height={24} className={styles.arrow} />
    </div>
  )
}
