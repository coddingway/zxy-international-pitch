import * as THREE from 'three'

// Screens 3–5 as a real 3D scene rather than a scrubbed frame sequence.
//
// Same shape as createFrameSequence — { draw(p), dispose() } with p in 0..1 —
// so Screen2 swaps one for the other without touching its choreography.
//
// The cotton is an InstancedMesh so the geometry source is a single slot: swap
// `bollGeometry` for a loaded GLB's geometry and everything else stands. That is
// the intended path once real models exist; the procedural boll below is a
// stand-in so the choreography can be built and tuned now.

const BOLLS = 1400
const FIELD = 46          // half-extent of the field, world units

const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)
const range = (v, a, b) => clamp01((v - a) / (b - a))
const ease = t => t * t * (3 - 2 * t)

export function createCottonScene({ canvas }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const sky = new THREE.Color('#8fd3f4')
  scene.background = sky.clone()
  scene.fog = new THREE.Fog(sky.clone(), 30, 120)

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400)

  scene.add(new THREE.AmbientLight(0xffffff, 1.5))
  const sun = new THREE.DirectionalLight(0xffffff, 2.2)
  sun.position.set(6, 12, 4)
  scene.add(sun)

  // ground
  const groundGeo = new THREE.PlaneGeometry(FIELD * 2.4, FIELD * 2.4)
  const groundMat = new THREE.MeshStandardMaterial({ color: '#6f7d5a', roughness: 1 })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  // --- the cotton. Replace this geometry with a loaded model to go photoreal.
  const bollGeometry = new THREE.IcosahedronGeometry(0.32, 1)
  const bollMaterial = new THREE.MeshStandardMaterial({ color: '#f6f4ef', roughness: 0.85 })
  const bolls = new THREE.InstancedMesh(bollGeometry, bollMaterial, BOLLS)
  bolls.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  scene.add(bolls)

  // resting layout + a per-boll scatter vector, generated once
  const rest = []
  for (let i = 0; i < BOLLS; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * FIELD
    rest.push({
      x: Math.cos(a) * r,
      y: 0.3 + Math.random() * 0.5,
      z: Math.sin(a) * r,
      s: 0.7 + Math.random() * 0.8,
      spinX: Math.random() * Math.PI, spinY: Math.random() * Math.PI,
      driftX: (Math.random() - 0.5) * 12,
      driftY: 8 + Math.random() * 26,
      driftZ: (Math.random() - 0.5) * 12,
      tumble: (Math.random() - 0.5) * 5,
    })
  }

  // the globe, reusing screen 1's texture so the two read as the same planet
  const globeTex = new THREE.TextureLoader().load('/globe-equirect.png')
  globeTex.colorSpace = THREE.SRGBColorSpace
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    new THREE.MeshBasicMaterial({ map: globeTex, transparent: true, opacity: 0 }),
  )
  globe.visible = false
  scene.add(globe)

  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const e = new THREE.Euler()
  const pos = new THREE.Vector3()
  const scl = new THREE.Vector3()

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!w || !h) return
    if (canvas.width !== w * renderer.getPixelRatio() || canvas.height !== h * renderer.getPixelRatio()) {
      renderer.setSize(w, h, false)
    }
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  // p 0..1 across screens 3–5:
  //   0.00–0.50  down among the bolls, camera pulling back and rising
  //   0.40–0.80  the field recedes and the globe grows in its place
  //   0.75–1.00  the bolls let go and scatter, sky washing toward white
  function draw(p) {
    resize()

    const pull = ease(range(p, 0, 0.5))
    const reveal = ease(range(p, 0.4, 0.8))
    const scatter = ease(range(p, 0.75, 1))

    camera.position.set(
      lerp(0, 0, pull),
      lerp(0.55, 26, pull) + scatter * 10,
      lerp(2.6, 62, pull) + scatter * 26,
    )
    camera.lookAt(0, lerp(0.4, 6, pull), 0)

    // sky brightens toward the whiteout that follows
    scene.background.copy(sky).lerp(new THREE.Color('#ffffff'), scatter * 0.85)
    scene.fog.color.copy(scene.background)

    ground.material.opacity = 1 - reveal
    ground.material.transparent = reveal > 0
    ground.visible = reveal < 1

    for (let i = 0; i < BOLLS; i++) {
      const b = rest[i]
      pos.set(
        b.x + b.driftX * scatter,
        b.y + b.driftY * scatter,
        b.z + b.driftZ * scatter,
      )
      e.set(b.spinX + b.tumble * scatter, b.spinY + b.tumble * scatter, 0)
      q.setFromEuler(e)
      const s = b.s * (1 - reveal * 0.65)
      scl.setScalar(s)
      m.compose(pos, q, scl)
      bolls.setMatrixAt(i, m)
    }
    bolls.instanceMatrix.needsUpdate = true

    globe.visible = reveal > 0
    if (globe.visible) {
      globe.material.opacity = reveal
      const gs = lerp(2, 13, reveal)
      globe.scale.setScalar(gs)
      globe.position.set(0, lerp(4, 16, reveal), lerp(-30, -46, reveal))
      globe.rotation.y = p * 1.2
    }

    renderer.render(scene, camera)
  }

  return {
    draw,
    dispose() {
      groundGeo.dispose(); groundMat.dispose()
      bollGeometry.dispose(); bollMaterial.dispose()
      globe.geometry.dispose(); globe.material.dispose()
      globeTex.dispose()
      renderer.dispose()
    },
  }
}
