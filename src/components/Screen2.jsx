import { useEffect, useRef } from 'react'
import GlobeBadge from './GlobeBadge.jsx'
import Nav from './Nav.jsx'
import ScrollCue from './ScrollCue.jsx'
import Screen6 from './Screen6.jsx'
import Screen7 from './Screen7.jsx'
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
const SEQ_END         = 0.74   // sequence reaches its last frame (screen 5)
const W6_IN           = 0.68   // second whiteout starts covering the sequence
const W6_PEAK         = 0.78   // solid white — sequence out, screen 6 in behind it
const W6_OUT          = 0.88   // white gone — screen 6 is already at full size by now
const S6_IN           = 0.78   // screen 6 appears, already at full layout
const JACKET_FULL     = 0.86   // the jacket alone finishes growing here
const JACKET_FROM     = 0.55   // the jacket alone starts this small
// 0.86 - 0.90 is a rest beat: nothing moves on scroll, so the float is seen.
const S7_IN           = 0.90   // screen 6 starts clearing out (figma Variant7)
const S7_OUT          = 1.00   // only nav + shrunken shirt remain
const JACKET_END      = 0.614  // 246/401 — the shirt's size in Variant7
const S7_HOLD_MS      = 1000   // beat between the clear-out finishing and four worlds
// Where the back-to-top button returns to: the rest beat between the jacket
// reaching full size and the clear-out starting, so screen 6 is fully assembled
// with its swatches in place.
const S6_REST         = (JACKET_FULL + S7_IN) / 2
const FRAME_COUNT     = 360    // public/cotton-seq/frame_001..360.jpg (covers screens 2-5)

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)
const range = (v, a, b) => clamp01((v - a) / (b - a))

export default function Screen2({ onBack }) {
  const scrollRef = useRef(null)
  const sceneRef  = useRef(null)
  const canvasRef = useRef(null)
  const whiteRef  = useRef(null)
  const s6Ref     = useRef(null)
  const white6Ref = useRef(null)
  const s7Ref     = useRef(null)

  useEffect(() => {
    const scroller = scrollRef.current
    const scene = sceneRef.current
    const canvas = canvasRef.current
    const white = whiteRef.current
    const s6    = s6Ref.current
    const white6 = white6Ref.current
    const s7El = s7Ref.current
    let holdTimer = 0
    let s7Shown = false
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

      // 4. scrub — scroll position IS the playhead
      if (onSeq) seq.draw(range(p, SWAP, SEQ_END))

      // 5. white backdrop sits behind screen 6, so it zooms against white rather
      //    than against the frozen last frame of the sequence
      white6.style.opacity = String(range(p, W6_IN, W6_PEAK))

      // 6. screen 6 arrives at full layout — only the jacket grows, via a CSS var
      //    the component reads, so nothing here re-renders React.
      const shown = p >= S6_IN
      s6.style.opacity = shown ? '1' : '0'
      s6.style.pointerEvents = shown ? 'auto' : 'none'
      const jp = range(p, S6_IN, JACKET_FULL)

      // 7. screen 6 clears out — headline and copy fade, clouds rise away,
      //    swatches slide off left, and the shirt shrinks and lifts. Each of
      //    those reads --s7 in CSS; only the shirt's scale is folded in here,
      //    since it has to compose with the arrival scale on one transform.
      const s7 = range(p, S7_IN, S7_OUT)
      s6.style.setProperty('--s7', String(s7))

      const arrive = JACKET_FROM + (1 - JACKET_FROM) * jp
      const exit = 1 + (JACKET_END - 1) * s7
      s6.style.setProperty('--s6-jacket-scale', String(arrive * exit))

      // float once the jacket is at its proper size, but stop it while it leaves
      s6.style.setProperty('--s6-float', jp >= 1 && s7 === 0 ? 'running' : 'paused')

      // 8. four worlds arrives a beat after the clear-out lands. Kept mounted the
      //    whole time so its four videos are already decoding — a video mounted
      //    on demand would stall on its first frame.
      if (s7 >= 1) {
        if (!s7Shown && !holdTimer) {
          holdTimer = setTimeout(() => {
            holdTimer = 0
            s7Shown = true
            s7El.style.opacity = '1'
            s7El.style.pointerEvents = 'auto'
          }, S7_HOLD_MS)
        }
      } else {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0 }
        if (s7Shown) {
          s7Shown = false
          s7El.style.opacity = '0'
          s7El.style.pointerEvents = 'none'
        }
      }
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
      if (holdTimer) clearTimeout(holdTimer)
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('visibilitychange', onScroll)
      seq.dispose()
    }
  }, [])

  // Back to the shirt/swatch screen, not to the very top of the runway.
  const backToSwatches = () => {
    const el = scrollRef.current
    if (!el) return
    const span = el.scrollHeight - el.clientHeight
    el.scrollTo({ top: span * S6_REST, behavior: 'smooth' })
  }

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
          {/* stays put for the whole scroll, and above screen 6 */}
          <div className={styles.cueWrap}>
            <ScrollCue />
          </div>
          <GlobeBadge onClick={onBack} />

          {/* white ground for screen 6 to grow against */}
          <div ref={white6Ref} className={styles.white6} />

          {/* Screen 6 rides in on the same scroll, scaling up from the centre */}
          <div ref={s6Ref} className={styles.screen6}>
            <Screen6 onBack={onBack} />
          </div>

          {/* Four worlds — mounted from the start so its videos are warm */}
          <div ref={s7Ref} className={styles.screen7}>
            <Screen7 onBackToTop={backToSwatches} />
          </div>
        </div>
      </div>
    </div>
  )
}
