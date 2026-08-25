import { useEffect, useRef } from 'react'
import GlobeBadge from './GlobeBadge.jsx'
import Nav from './Nav.jsx'
import ScrollCue from './ScrollCue.jsx'
import Screen6 from './Screen6.jsx'
import styles from './Screen2.module.css'
import { createFrameSequence } from '../lib/frameSequence.js'

// Scroll choreography, as fractions of the scroll track.
// The scene zooms into the field, white takes over, then the video is scrubbed
// frame-by-frame by the remaining scroll. Nothing ever auto-plays.
const ZOOM_END        = 0.35   // scene finishes its zoom
const ZOOM_SCALE      = 2.4
const WHITE_IN        = 0.26   // white starts covering
const SWAP            = 0.40   // white is solid: scene out, video in
const WHITE_OUT       = 0.54   // white fully gone, video exposed
const CUE_OUT         = 0.12   // scroll cue fades once scrolling starts
const SEQ_END         = 0.74   // sequence reaches its last frame (screen 5)
const W6_IN           = 0.68   // second whiteout starts covering the sequence
const W6_PEAK         = 0.78   // solid white — sequence out, screen 6 in behind it
const W6_OUT          = 0.88   // white gone — screen 6 is already at full size by now
const S6_IN           = 0.78   // screen 6 starts settling up from centre
const S6_FULL         = 0.85   // reaches full size while still under white
const S6_FROM_SCALE   = 0.82   // a gentle settle, not a zoom from a small card
const FRAME_COUNT     = 360    // public/cotton-seq/frame_001..360.jpg (covers screens 2-5)

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)
const range = (v, a, b) => clamp01((v - a) / (b - a))

export default function Screen2({ onBack }) {
  const scrollRef = useRef(null)
  const sceneRef  = useRef(null)
  const canvasRef = useRef(null)
  const whiteRef  = useRef(null)
  const cueRef    = useRef(null)
  const s6Ref     = useRef(null)
  const white6Ref = useRef(null)

  useEffect(() => {
    const scroller = scrollRef.current
    const scene = sceneRef.current
    const canvas = canvasRef.current
    const white = whiteRef.current
    const cue   = cueRef.current
    const s6    = s6Ref.current
    const white6 = white6Ref.current
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

      // 2. white covers each swap — field to sequence, then sequence to screen 6
      const w1 = range(p, WHITE_IN, SWAP) - range(p, SWAP, WHITE_OUT)
      const w2 = range(p, W6_IN, W6_PEAK) - range(p, W6_PEAK, W6_OUT)
      white.style.opacity = String(Math.max(w1, w2))

      // 3. hand off to the sequence under full white
      const onSeq = p >= SWAP
      scene.style.opacity = onSeq ? '0' : '1'
      canvas.style.opacity = onSeq ? '1' : '0'
      cue.style.opacity = String(1 - range(p, 0, CUE_OUT))

      // 4. scrub — scroll position IS the playhead
      if (onSeq) seq.draw(range(p, SWAP, SEQ_END))

      // 5. white backdrop sits behind screen 6, so it zooms against white rather
      //    than against the frozen last frame of the sequence
      white6.style.opacity = String(range(p, W6_IN, W6_PEAK))

      // 6. screen 6 zooms up from the centre and fills the viewport
      const s6p = range(p, S6_IN, S6_FULL)
      s6.style.opacity = s6p > 0 ? '1' : '0'
      s6.style.pointerEvents = s6p >= 1 ? 'auto' : 'none'
      s6.style.transform = `scale(${S6_FROM_SCALE + (1 - S6_FROM_SCALE) * s6p})`
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

          {/* white ground for screen 6 to grow against */}
          <div ref={white6Ref} className={styles.white6} />

          {/* Screen 6 rides in on the same scroll, scaling up from the centre */}
          <div ref={s6Ref} className={styles.screen6}>
            <Screen6 onBack={onBack} />
          </div>
        </div>
      </div>
    </div>
  )
}
