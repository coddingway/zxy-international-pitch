import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Screens 3–5 as a real 3D scene rather than a scrubbed frame sequence.
//
// Same shape as createFrameSequence — { draw(p), dispose() } with p in 0..1 —
// so Screen2 swaps one for the other without touching its choreography.
//
// The cotton is a real scanned boll, baked by scripts/bake-cotton.mjs into two
// levels with normals and vertex colours — the source GLB has neither, and no
// UVs either, so the paint is procedural (see the bake script).
//
// Two InstancedMeshes rather than one: the opening shot sits down among the
// bolls, where the 3.3k-tri level is visibly faceted, but 1400 instances of the
// 20k-tri level is 28M triangles a frame. So the handful nearest the camera's
// start use the full mesh and everything else uses the simplified one. The split
// is decided once at build, not per frame.
const BOLLS = 1400
const NEAR_BOLLS = 90     // how many get the full-detail mesh
const FIELD = 30          // half-extent; tighter reads denser at no triangle cost
const BOLL_RADIUS = 0.34  // world radius a boll should occupy
const CAM_START = new THREE.Vector3(0, 0.55, 2.6)

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

  // --- the cotton, filled in once the models land
  const bollMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 })
  let near = null, far = null, ready = false

  const loader = new GLTFLoader()
  const firstMesh = gltf => { let g = null; gltf.scene.traverse(o => { if (o.isMesh && !g) g = o.geometry }); return g }

  Promise.all([
    loader.loadAsync('/cotton-boll-hi.glb'),
    loader.loadAsync('/cotton-boll-lo.glb'),
  ]).then(([hi, lo]) => {
    const hiGeo = firstMesh(hi), loGeo = firstMesh(lo)
    // normalise: the model is ~1.23 units in radius, we want BOLL_RADIUS
    hiGeo.computeBoundingSphere()
    const k = BOLL_RADIUS / hiGeo.boundingSphere.radius
    hiGeo.scale(k, k, k); loGeo.scale(k, k, k)

    near = new THREE.InstancedMesh(hiGeo, bollMaterial, NEAR_BOLLS)
    far = new THREE.InstancedMesh(loGeo, bollMaterial, BOLLS - NEAR_BOLLS)
    near.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    far.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    near.frustumCulled = false
    far.frustumCulled = false
    scene.add(near, far)
    ready = true
  }).catch(() => { /* leave the field empty rather than throwing mid-scroll */ })

  // resting layout + a per-boll scatter vector, generated once, then sorted so
  // the ones the camera opens on are first and can take the detailed mesh
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
      yaw: Math.random() * Math.PI * 2,
    })
  }
  rest.sort((a, b) =>
    CAM_START.distanceToSquared(new THREE.Vector3(a.x, a.y, a.z)) -
    CAM_START.distanceToSquared(new THREE.Vector3(b.x, b.y, b.z)))

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

  // Returns false when the canvas has no laid-out size yet — the first draw can
  // arrive before layout, and rendering then fills a 0x0 buffer and shows
  // nothing until something else happens to trigger another frame.
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!w || !h) return false
    if (canvas.width !== w * renderer.getPixelRatio() || canvas.height !== h * renderer.getPixelRatio()) {
      renderer.setSize(w, h, false)
    }
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    return true
  }

  // p 0..1 across screens 3–5:
  //   0.00–0.50  down among the bolls, camera pulling back and rising
  //   0.40–0.80  the field recedes and the globe grows in its place
  //   0.75–1.00  the bolls let go and scatter, sky washing toward white
  function draw(p) {
    if (!resize()) return

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

    if (ready) {
      for (let i = 0; i < BOLLS; i++) {
        const b = rest[i]
        pos.set(
          b.x + b.driftX * scatter,
          b.y + b.driftY * scatter,
          b.z + b.driftZ * scatter,
        )
        // upright while resting; only tumbling once they let go
        e.set(b.tumble * scatter, b.yaw + b.tumble * scatter, b.tumble * scatter * 0.6)
        q.setFromEuler(e)
        scl.setScalar(b.s * (1 - reveal * 0.65))
        m.compose(pos, q, scl)
        if (i < NEAR_BOLLS) near.setMatrixAt(i, m)
        else far.setMatrixAt(i - NEAR_BOLLS, m)
      }
      near.instanceMatrix.needsUpdate = true
      far.instanceMatrix.needsUpdate = true
    }

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
      near?.geometry.dispose(); far?.geometry.dispose()
      bollMaterial.dispose()
      globe.geometry.dispose(); globe.material.dispose()
      globeTex.dispose()
      renderer.dispose()
    },
  }
}
