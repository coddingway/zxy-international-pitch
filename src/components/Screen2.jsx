import { useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import GlobeBadge from './GlobeBadge.jsx'
import Nav from './Nav.jsx'
import ScrollCue from './ScrollCue.jsx'
import Screen6 from './Screen6.jsx'
import Screen7 from './Screen7.jsx'
import styles from './Screen2.module.css'
import { createFrameSequence } from '../lib/frameSequence.js'

// Scroll choreography, as fractions of the scroll track.
// The scene zooms through the wordmark, white takes over, then the sequence is
// scrubbed frame-by-frame by the remaining scroll. Nothing ever auto-plays.
// The field phase is deliberately short — 2 viewport heights, not the 5.6 it
// took before — while the sequence keeps ~12px of scroll per frame.
const ZOOM_END        = 0.168   // scene finishes its zoom
// Big enough that the letter grows past the viewport and we pass through it —
// the "n" is white, so filling the screen with it IS the start of the whiteout.
const ZOOM_SCALE      = 14
const WHITE_IN        = 0.125   // white starts covering
const SWAP            = 0.192   // white is solid: scene out, video in
const WHITE_OUT       = 0.381   // white fully gone, video exposed
const SEQ_END         = 0.650   // sequence reaches its last frame (screen 5)
const W6_IN           = 0.569   // second whiteout starts covering the sequence
const W6_PEAK         = 0.704   // solid white — sequence out, screen 6 in behind it
const W6_OUT          = 0.838   // white gone — screen 6 is already at full size by now
const S6_IN           = 0.704   // screen 6 appears, already at full layout
const JACKET_FULL     = 0.812   // the jacket alone finishes growing here
const JACKET_FROM     = 0.55   // the jacket alone starts this small
// 0.86 - 0.90 is a rest beat: nothing moves on scroll, so the float is seen.
const S7_IN           = 0.865   // screen 6 starts clearing out (figma Variant7)
const S7_OUT          = 1.00   // only nav + shrunken shirt remain
const JACKET_END      = 0.614  // 246/401 — the shirt's size in Variant7
const S7_HOLD_MS      = 1000   // beat between the clear-out finishing and four worlds
// Screen 7's videos only start buffering here. Left at preload=auto they began
// at ~433ms, ahead of the frame sequence they compete with, and the frames are
// needed within seconds while the videos are not needed for a minute.
const VIDEO_WARM      = 0.42
// Where the back-to-top button returns to: the rest beat between the jacket
// reaching full size and the clear-out starting, so screen 6 is fully assembled
// with its swatches in place.
const S6_REST         = (JACKET_FULL + S7_IN) / 2
const ZOOM_LETTER     = 'e'    // the glyph the camera flies through
const FRAME_COUNT     = 360    // public/cotton-seq/frame_001..360.jpg (covers screens 2-5)

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)
const range = (v, a, b) => clamp01((v - a) / (b - a))

export default function Screen2({ onBack }) {
  const [s7Visible, setS7Visible] = useState(false)
  const [warmVideos, setWarmVideos] = useState(false)
  const scrollRef = useRef(null)
  const sceneRef  = useRef(null)
  const canvasRef = useRef(null)
  const whiteRef  = useRef(null)
  const s6Ref     = useRef(null)
  const white6Ref = useRef(null)
  const s7Ref     = useRef(null)
  const cueRef    = useRef(null)
  const trackRef  = useRef(null)
  const brandRef  = useRef(null)
  const lenisRef  = useRef(null)

  // Aim the zoom at ZOOM_LETTER in the wordmark, so the scene flies through that
  // letter rather than the middle of the frame. Measured from the live glyph
  // with a Range rather than hardcoded: the font is sized in vw, so the letter
  // moves with the viewport, and a guessed coordinate would drift.
  useEffect(() => {
    const brand = brandRef.current
    const scene = sceneRef.current
    if (!brand || !scene) return
    let dead = false

    const place = () => {
      if (dead) return
      const text = brand.firstChild
      if (!text || text.nodeType !== 3) return
      // measure unscaled — on a resize mid-scroll the scene is mid-zoom
      const prev = scene.style.transform
      scene.style.transform = 'none'
      const box = scene.getBoundingClientRect()
      const str = text.textContent
      let best = null
      for (let i = 0; i < str.length; i++) {
        if (str[i] !== ZOOM_LETTER) continue
        const range = document.createRange()
        range.setStart(text, i)
        range.setEnd(text, i + 1)
        const g = range.getBoundingClientRect()
        // aim at the left stroke, not the glyph centre: both "n" and "e" are
        // hollow in the middle, so the centre would fly through the counter and
        // show field instead of white
        const x = g.left + g.width * 0.18
        const y = g.top + g.height * 0.62
        const d = Math.abs(x - (box.left + box.width / 2))
        if (!best || d < best.d) best = { d, x, y }
      }
      scene.style.transform = prev
      if (!best) return
      scene.style.transformOrigin =
        `${((best.x - box.left) / box.width) * 100}% ${((best.y - box.top) / box.height) * 100}%`
    }

    place()
    document.fonts?.ready?.then(place).catch(() => {})
    window.addEventListener('resize', place)
    return () => { dead = true; window.removeEventListener('resize', place) }
  }, [])

  useEffect(() => {
    const scroller = scrollRef.current
    const scene = sceneRef.current
    const canvas = canvasRef.current
    const white = whiteRef.current
    const s6    = s6Ref.current
    const white6 = white6Ref.current
    const s7El = s7Ref.current
    const cue = cueRef.current
    const stage = scroller.querySelector(`.${styles.stage}`)
    let holdTimer = 0
    let s7Shown = false
    let warm = false
    let raf = 0

    // Smooth scrolling for the whole runway. The scroller is a div rather than
    // the window, so Lenis is pointed at it explicitly. It still writes
    // scrollTop and still fires `scroll`, so `apply` below needs no changes.
    const lenis = new Lenis({
      wrapper: scroller,
      content: trackRef.current,
      duration: 1.1,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })
    lenisRef.current = lenis

    let lenisRaf = 0
    const tick = time => { lenis.raf(time); lenisRaf = requestAnimationFrame(tick) }
    lenisRaf = requestAnimationFrame(tick)

    const seq = createFrameSequence({
      canvas,
      count: FRAME_COUNT,
      url: n => `/cotton-seq/frame_${String(n).padStart(3, '0')}.jpg`,
    })

    const apply = () => {
      raf = 0
      // Scale factor for the fixed 1440x907 artboards inside screens 6 and 7.
      // `contain`, so the whole composition is always on screen whatever the
      // viewport aspect — the background layers fill independently behind it.
      stage.style.setProperty('--fit', String(Math.min(innerWidth / 1440, innerHeight / 907)))
      const span = scroller.scrollHeight - scroller.clientHeight
      const p = span > 0 ? clamp01(scroller.scrollTop / span) : 0

      // 1. camera pushes into the field — accelerating, so it reads as a descent
      const z = range(p, 0, ZOOM_END)
      scene.style.transform = `scale(${1 + (ZOOM_SCALE - 1) * z * z})`

      // start buffering screen 7's videos once the sequence is well underway
      if (p >= VIDEO_WARM) warm ||= (setWarmVideos(true), true)

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
            setS7Visible(true)
            // four worlds is the end of the runway — nothing left to scroll to
            cue.style.opacity = '0'
          }, S7_HOLD_MS)
        }
      } else {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0 }
        if (s7Shown) {
          s7Shown = false
          s7El.style.opacity = '0'
          s7El.style.pointerEvents = 'none'
          setS7Visible(false)
          cue.style.opacity = '1'
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
      cancelAnimationFrame(lenisRaf)
      lenis.destroy()
      lenisRef.current = null
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
    const top = (el.scrollHeight - el.clientHeight) * S6_REST
    // through Lenis, not el.scrollTo — a native smooth scroll and the smooth
    // scroller would drive scrollTop against each other
    if (lenisRef.current) lenisRef.current.scrollTo(top, { duration: 1.4 })
    else el.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div ref={scrollRef} className={styles.root}>
      <div ref={trackRef} className={styles.track}>
        <div className={styles.stage}>
          <div ref={sceneRef} className={styles.scene}>
            {/* image 32 — aerial field, cropped square */}
            <img src="/field-top.png" alt="" className={styles.field} />

            {/* Brand name — above the field, below the clouds */}
            <p ref={brandRef} className={styles.brand}>ZXY International</p>

            {/* Clouds drift above the field. Cloud 3 reuses Cloud 1's bitmap (as in Figma). */}
            <img src="/cloud-1.png" alt="" className={`${styles.cloud} ${styles.cloud1}`} />
            <img src="/cloud-2.png" alt="" className={`${styles.cloud} ${styles.cloud2}`} />
            <img src="/cloud-1.png" alt="" className={`${styles.cloud} ${styles.cloud3}`} />
          </div>

          <canvas ref={canvasRef} className={styles.video} aria-hidden="true" />

          <div ref={whiteRef} className={styles.white} />

          <Nav />
          {/* stays put for the whole scroll, and above screen 6 */}
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

          {/* Four worlds — mounted from the start, but its videos stay unloaded
              until VIDEO_WARM so they do not compete with the frame sequence */}
          <div ref={s7Ref} className={styles.screen7}>
            <Screen7 onBackToTop={backToSwatches} visible={s7Visible} warm={warmVideos} />
          </div>
        </div>
      </div>
    </div>
  )
}
