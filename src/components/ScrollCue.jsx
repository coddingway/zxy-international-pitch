import styles from './ScrollCue.module.css'

// Bottom-centre circle carried by screens 2–6 (Figma "Ellipse 5").
// Purely presentational — the design gives it no icon or behaviour yet.
export default function ScrollCue() {
  return <div className={styles.cue} aria-hidden="true" />
}
