import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'

// lat/lon positions of crop labels on the sphere surface
// lon=0 = front-facing at start; positive lon = right, negative = left
const TOOLTIP_ANCHORS = [
  { label: 'Hemp',        lat:  33, lon: -57 },
  { label: 'Flax',        lat:  42, lon:  67 },
  { label: 'eucalyptus',  lat:  -4, lon:  47 },
  { label: 'Cotton boll', lat: -66, lon: -13 },
]

function latLonToVec3(lat, lon) {
  const φ = (lat * Math.PI) / 180
  const λ = (lon * Math.PI) / 180
  return new THREE.Vector3(
    Math.cos(φ) * Math.sin(λ),
    Math.sin(φ),
    Math.cos(φ) * Math.cos(λ),
  )
}

const BASE_VECTORS = TOOLTIP_ANCHORS.map(a => latLonToVec3(a.lat, a.lon))

export default function Globe({ size = 648 }) {
  const mountRef    = useRef(null)
  const tooltipRefs = useRef([])
  const stateRef    = useRef({ paused: false, mesh: null, raf: null, dragging: false, lastX: 0, velocity: 0 })

  useEffect(() => {
    const el = mountRef.current
    const W = size, H = size

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
    camera.position.set(0, 0.8, 3.8)
    camera.lookAt(0, 0, 0)

    const geometry = new THREE.SphereGeometry(1, 64, 64)
    const texture  = new THREE.TextureLoader().load('/globe-equirect.png')
    texture.colorSpace = THREE.SRGBColorSpace
    const material = new THREE.MeshBasicMaterial({ map: texture })
    const mesh     = new THREE.Mesh(geometry, material)
    mesh.scale.set(0, 0, 0)
    scene.add(mesh)
    stateRef.current.mesh = mesh

    const atmGeo = new THREE.SphereGeometry(1.03, 64, 64)
    const atmMat = new THREE.MeshBasicMaterial({ color: 0x4488cc, transparent: true, opacity: 0.06, side: THREE.BackSide })
    scene.add(new THREE.Mesh(atmGeo, atmMat))

    gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 1.4, ease: 'power2.out', delay: 0.3 })

    const SPEED = 0.0015
    const DRAG_SENSITIVITY = 0.005
    const DAMPING = 0.93
    const tmpWorld = new THREE.Vector3()
    const tmpProj  = new THREE.Vector3()
    const tmpNorm  = new THREE.Vector3()
    const tmpToCam = new THREE.Vector3()

    function animate() {
      stateRef.current.raf = requestAnimationFrame(animate)
      const s = stateRef.current
      if (s.dragging) {
        // nothing — mousemove drives rotation directly
      } else if (Math.abs(s.velocity) > 0.0001) {
        // momentum coast after drag release
        mesh.rotation.y += s.velocity
        s.velocity *= DAMPING
      } else {
        s.velocity = 0
        if (!s.paused) mesh.rotation.y -= SPEED
      }
      renderer.render(scene, camera)

      // Project tooltip anchors to canvas coords
      mesh.updateMatrixWorld()
      const refs = tooltipRefs.current

      BASE_VECTORS.forEach((base, i) => {
        const el = refs[i]
        if (!el) return

        tmpWorld.copy(base).applyMatrix4(mesh.matrixWorld)
        tmpNorm.copy(tmpWorld).normalize()
        tmpToCam.copy(camera.position).sub(tmpWorld).normalize()
        const visible = tmpNorm.dot(tmpToCam) > 0.12

        if (!visible) { el.style.opacity = '0'; return }

        tmpProj.copy(tmpWorld).project(camera)
        const x = ((tmpProj.x + 1) / 2) * W
        const y = ((-tmpProj.y + 1) / 2) * H

        el.style.opacity = '1'
        el.style.left = x + 'px'
        el.style.top  = y + 'px'
      })
    }
    animate()

    const onMouseDown = (e) => {
      const s = stateRef.current
      s.dragging = true
      s.lastX = e.clientX
      s.velocity = 0
      s.paused = true
      gsap.killTweensOf(mesh.rotation)
      el.style.cursor = 'grabbing'
    }

    const onMouseMove = (e) => {
      const s = stateRef.current
      if (!s.dragging) return
      const dx = e.clientX - s.lastX
      s.lastX = e.clientX
      // exponential moving average for smooth velocity tracking
      s.velocity = s.velocity * 0.6 + dx * DRAG_SENSITIVITY * 0.4
      mesh.rotation.y += dx * DRAG_SENSITIVITY
    }

    const onMouseUp = () => {
      const s = stateRef.current
      if (!s.dragging) return
      s.dragging = false
      // let momentum coast — animate loop handles it, then resumes auto-spin
      el.style.cursor = 'grab'
    }

    el.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)

    return () => {
      cancelAnimationFrame(stateRef.current.raf)
      el.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      atmGeo.dispose()
      atmMat.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [size])

  const pause = () => {
    const s = stateRef.current
    if (s.dragging || Math.abs(s.velocity) > 0.0001) return
    s.paused = true
    const rot = s.mesh.rotation
    gsap.killTweensOf(rot)
    let y = rot.y % (Math.PI * 2)
    if (y > Math.PI) y -= Math.PI * 2
    if (y < -Math.PI) y += Math.PI * 2
    rot.y = y
    gsap.to(rot, { y: 0, duration: 1.0, ease: 'power2.out' })
  }
  const resume = () => {
    const s = stateRef.current
    if (s.dragging) return
    gsap.killTweensOf(s.mesh.rotation)
    s.velocity = 0
    s.paused = false
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Canvas — clipped to circle */}
      <div
        ref={mountRef}
        onMouseEnter={pause}
        onMouseLeave={resume}
        style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', cursor: 'grab', position: 'absolute', inset: 0 }}
      />
      {/* Tooltip overlay — outside clip, tracks 3D positions */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {TOOLTIP_ANCHORS.map((anchor, i) => (
          <div
            key={anchor.label}
            ref={el => { tooltipRefs.current[i] = el }}
            style={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: 'translate(-50%, -100%)',
              filter: 'drop-shadow(0px 15px 15px rgba(0,0,0,0.5))',
              opacity: 0,
              pointerEvents: 'none',
            }}
          >
            <div style={{
              background: '#fff',
              borderRadius: 6,
              padding: '7px 10px',
              fontSize: 14,
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 400,
              color: '#000',
              whiteSpace: 'nowrap',
              lineHeight: 'normal',
            }}>
              {anchor.label}
            </div>
            <div style={{
              width: 0, height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #fff',
            }} />
          </div>
        ))}
      </div>
    </div>
  )
}
