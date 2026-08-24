import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import Screen1 from './components/Screen1.jsx'
import Screen2 from './components/Screen2.jsx'

export default function App() {
  const [screen, setScreen] = useState(1)
  const flashRef = useRef(null)

  // Whiteout, swap, clear. `delay`/`inDur` let the forward trip line its peak up
  // with the globe's 1.45s camera dolly; the trip back has no dolly to match.
  const fadeToScreen = (n, { delay = 0, inDur = 0.35, outDur = 0.45 } = {}) => {
    gsap.timeline()
      .to(flashRef.current, { opacity: 1, duration: inDur, ease: 'power2.in' }, delay)
      .add(() => setScreen(n))
      .to(flashRef.current, { opacity: 0, duration: outDur, ease: 'power2.out' })
  }

  // Fired the moment an anchor is clicked — the globe starts its 1.45s camera
  // dolly and we ride it, peaking the white exactly as the camera hits the surface.
  const handleAnchorClick = () => fadeToScreen(2, { delay: 0.75, inDur: 0.7, outDur: 0.6 })

  // The corner globe badge on screens 2–6 comes back here.
  const handleBack = () => fadeToScreen(1)

  return (
    <>
      {screen === 1
        ? <Screen1 onAnchorClick={handleAnchorClick} />
        : <Screen2 onBack={handleBack} />}

      <div
        ref={flashRef}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#fff',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 100,
        }}
      />
    </>
  )
}
