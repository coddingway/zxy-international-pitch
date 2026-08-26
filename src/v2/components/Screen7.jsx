import { useEffect, useRef, useState } from 'react'
import Nav from './Nav.jsx'
import styles from './Screen7.module.css'
import arrowDown from '../../assets/icon-arrow-down.svg'

// Each world has its own background video and its own accent for the active
// label. Inactive labels are black at 10%, per Figma.
const WORLDS = [
  { key: 'lifestyle',  label: 'Lifestyle',  ink: '#437FDF' },
  { key: 'sportswear', label: 'Sportswear', ink: '#7C9E3C' },
  { key: 'home',       label: 'Home',       ink: '#5B3B2F' },
  { key: 'workwear',   label: 'Workwear',   ink: '#000000' },
]

// the world showing on arrival — loaded up front so landing here never waits
const FIRST = WORLDS[0].key

export default function Screen7({ onBackToTop, visible = true, warm = true }) {
  const [world, setWorld] = useState('lifestyle')
  const refs = useRef({})

  // Start the active world from its first frame whenever the screen appears or
  // the world changes. These clips open on the model facing front, and that
  // opening pose is the shot — autoplaying from page load meant a 10s clip had
  // already looped several times before anyone arrived, so you joined it
  // mid-movement with the model off to one side.
  useEffect(() => {
    const all = Object.entries(refs.current)
    if (!visible) {
      all.forEach(([, v]) => v && v.pause())
      return
    }
    const el = refs.current[world]
    if (!el) return
    el.currentTime = 0
    el.play?.()?.catch(() => {})   // a blocked autoplay must not throw
    // let the outgoing clip run through the crossfade, then stop it — only one
    // video decodes at rest, which is what keeps this cheap
    const t = setTimeout(() => {
      all.forEach(([k, v]) => { if (k !== world && v) v.pause() })
    }, 650)
    return () => clearTimeout(t)
  }, [visible, world])

  return (
    <div className={styles.root}>
      {/* every video mounted and playing, so switching is a pure crossfade */}
      {WORLDS.map(w => (
        <video
          key={w.key}
          ref={el => { refs.current[w.key] = el }}
          className={`${styles.video} ${world === w.key ? styles.videoOn : ''}`}
          src={`/screen6/${w.key}.mp4`}
          muted
          loop
          playsInline
          /* The first world loads immediately so arriving never stalls; the
             other three wait until the scroll is well into the sequence, so
             they do not compete with the frames for bandwidth. */
          preload={w.key === FIRST || warm ? 'auto' : 'none'}
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
