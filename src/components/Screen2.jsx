import { useEffect, useRef } from 'react'
import GlobeBadge from './GlobeBadge.jsx'
import Nav from './Nav.jsx'
import ScrollCue from './ScrollCue.jsx'
import styles from './Screen2.module.css'
import { createFrameSequence } from '../lib/frameSequence.js'

// Scroll choreography, as fractions of the scroll track.
// The scene zooms into the field, white takes over, then the video is scrubbed
// frame-by-frame by the remaining scroll. Nothing ever auto-plays.
const ZOOM_END        = 0.35   // scene finishes its zoom
const ZOOM_SCALE      = 2.4
// Must stay in ascending order: WHITE_IN < SWAP < WHITE_OUT. White is
// range(p, WHITE_IN, SWAP) - range(p, SWAP, WHITE_OUT), so if SWAP drops below
// WHITE_IN the first range runs backwards and pins white at 1 from p=0 — the
// field is then never visible.
const WHITE_IN        = 0.26   // white starts covering
const SWAP            = 0.40   // white is solid: scene out, sequence in
const WHITE_OUT       = 0.54   // white fully gone, sequence exposed
const CUE_OUT         = 0.12   // scroll cue fades once scrolling starts
const FRAME_COUNT     = 192    // public/cotton-seq/frame_001..192.jpg

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)
const range = (v, a, b) => clamp01((v - a) / (b - a))

export default function Screen2({ onBack }) {
  const scrollRef = useRef(null)
  const sceneRef  = useRef(null)
  const canvasRef = useRef(null)
  const whiteRef  = useRef(null)
  const cueRef    = useRef(null)

  useEffect(() => {
    const scroller = scrollRef.current
    const scene = sceneRef.current
    const canvas = canvasRef.current
    const white = whiteRef.current
    const cue   = cueRef.current
    let raf = 0

    const seq = createFrameSequence({
      canvas,
      count: FRAME_COUNT,
      url: n => `/cotton-seq/frame_${String(n).padStart(3, '0')}.jpg`,
    })

    const apply = () => {
      raf = 0
      const span = scroller.scrollHeight - scroller.clientHeight
      const p = span > 0 ? clamp01(scroller.scrollTop / span) : 0

      // 1. camera pushes into the field — accelerating, so it reads as a descent
      const z = range(p, 0, ZOOM_END)
      scene.style.transform = `scale(${1 + (ZOOM_SCALE - 1) * z * z})`

      // 2. white covers the swap
      white.style.opacity = String(range(p, WHITE_IN, SWAP) - range(p, SWAP, WHITE_OUT))

      // 3. hand off to the sequence under full white
      const onSeq = p >= SWAP
      scene.style.opacity = onSeq ? '0' : '1'
      canvas.style.opacity = onSeq ? '1' : '0'
      cue.style.opacity = String(1 - range(p, 0, CUE_OUT))

      // 4. scrub — scroll position IS the playhead
      if (onSeq) seq.draw(range(p, SWAP, 1))
    }

    // Cancel-and-requeue rather than an `if (!raf)` guard: a frame queued while
    // the tab is hidden may never fire, which would leave the guard latched and
    // silently kill every later scroll update.
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(apply)
    }

    scroller.scrollTop = 0
    scroller.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    document.addEventListener('visibilitychange', onScroll)
    apply()

    return () => {
      cancelAnimationFrame(raf)
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('visibilitychange', onScroll)
      seq.dispose()
    }
  }, [])

  return (
    <div ref={scrollRef} className={styles.root}>
      <div className={styles.track}>
        <div className={styles.stage}>
          <div ref={sceneRef} className={styles.scene}>
            {/* image 32 — aerial field, cropped square */}
            <img src="/field-top.png" alt="" className={styles.field} />

            {/* Clouds drift above the field. Cloud 3 reuses Cloud 1's bitmap (as in Figma). */}
            <img src="/cloud-1.png" alt="" className={`${styles.cloud} ${styles.cloud1}`} />
            <img src="/cloud-2.png" alt="" className={`${styles.cloud} ${styles.cloud2}`} />
            <img src="/cloud-1.png" alt="" className={`${styles.cloud} ${styles.cloud3}`} />
          </div>

          <canvas ref={canvasRef} className={styles.video} aria-hidden="true" />

          <div ref={whiteRef} className={styles.white} />

          <Nav />
          <div ref={cueRef} className={styles.cueWrap}>
            <ScrollCue />
          </div>
          <GlobeBadge onClick={onBack} />
        </div>
      </div>
    </div>
  )
}
