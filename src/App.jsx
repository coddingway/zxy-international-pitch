import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import Screen1 from './components/Screen1.jsx'
import Screen2 from './components/Screen2.jsx'

export default function App() {
  const [screen, setScreen] = useState(1)
  const flashRef = useRef(null)

  // Fired the moment an anchor is clicked — the globe starts its 1.45s camera dolly,
  // we ride it with a whiteout that peaks exactly as the camera reaches the surface.
  const handleAnchorClick = () => {
    gsap.timeline()
      .to(flashRef.current, { opacity: 1, duration: 0.7, ease: 'power2.in' }, 0.75)
      .add(() => setScreen(2))
      .to(flashRef.current, { opacity: 0, duration: 0.6, ease: 'power2.out' })
  }

  return (
    <>
      {screen === 1
        ? <Screen1 onAnchorClick={handleAnchorClick} />
        : <Screen2 />}

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
