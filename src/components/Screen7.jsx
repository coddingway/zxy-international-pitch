import { useState } from 'react'
import Nav from './Nav.jsx'
import styles from './Screen7.module.css'
import arrowDown from '../assets/icon-arrow-down.svg'

// Each world has its own background video and its own accent for the active
// label. Inactive labels are black at 10%, per Figma.
const WORLDS = [
  { key: 'lifestyle',  label: 'Lifestyle',  ink: '#437FDF' },
  { key: 'sportswear', label: 'Sportswear', ink: '#7C9E3C' },
  { key: 'home',       label: 'Home',       ink: '#5B3B2F' },
  { key: 'workwear',   label: 'Workwear',   ink: '#000000' },
]

export default function Screen7({ onBackToTop }) {
  const [world, setWorld] = useState('lifestyle')

  return (
    <div className={styles.root}>
      {/* every video mounted and playing, so switching is a pure crossfade */}
      {WORLDS.map(w => (
        <video
          key={w.key}
          className={`${styles.video} ${world === w.key ? styles.videoOn : ''}`}
          src={`/screen6/${w.key}.mp4`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
        />
      ))}

      <div className={styles.artboard}>
      <div className={styles.title}>
        <h2 className={styles.titleBig}>{'Four\nWorlds'}</h2>
        <p className={styles.titleSub}>
          Brought together through one seamless apparel solutions partner.
        </p>
      </div>

      <div className={styles.worlds}>
        {WORLDS.map(w => (
          <button
            key={w.key}
            type="button"
            className={`${styles.world} ${world === w.key ? styles.worldOn : ''}`}
            style={{ '--world-ink': w.ink }}
            aria-pressed={world === w.key}
            onClick={() => setWorld(w.key)}
          >
            {w.label}
          </button>
        ))}
      </div>

      <button type="button" className={styles.up} onClick={onBackToTop} aria-label="Back to top">
        <img src={arrowDown} alt="" className={styles.upIcon} />
      </button>
      </div>

      <Nav />
    </div>
  )
}
