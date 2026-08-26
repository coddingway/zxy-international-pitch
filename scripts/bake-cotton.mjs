/**
 * Bakes the raw cotton boll GLB into two render-ready levels.
 *
 * The source has POSITION and indices only — no normals, no UVs, no materials —
 * so it renders unlit/black as-is and cannot be texture-mapped. This adds:
 *   - vertex normals (computed)
 *   - vertex colours (procedural: white lint on the lobes, dried husk below,
 *     driven by height and splay, since there are no UVs to paint into)
 * and writes a simplified level for the bulk of the field.
 *
 * Done offline because SimplifyModifier costs ~0.5s of main thread — a visible
 * jank if it ran on load.
 */
import * as THREE from 'three'
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js'
import { readFileSync, writeFileSync } from 'fs'

const SRC = 'media-src/cotton-boll-source.glb'
const LO_KEEP = 0.15   // ~3.3k tris, for the bulk of the field

// ---------- read the GLB (POSITION + indices is all it has) ----------
function readGlb(path) {
  const buf = readFileSync(path)
  const len = buf.readUInt32LE(8)
  let off = 12, json = null, bin = null
  while (off < len) {
    const clen = buf.readUInt32LE(off)
    const ctype = buf.toString('utf8', off + 4, off + 8)
    const body = buf.subarray(off + 8, off + 8 + clen)
    if (ctype.startsWith('JSON')) json = JSON.parse(body.toString('utf8'))
    else bin = body
    off += 8 + clen
  }
  const prim = json.meshes[0].primitives[0]
  const read = (accIdx, Type, comps) => {
    const acc = json.accessors[accIdx]
    const bv = json.bufferViews[acc.bufferView]
    const start = (bv.byteOffset || 0) + (acc.byteOffset || 0)
    return new Type(bin.buffer, bin.byteOffset + start, acc.count * comps)
  }
  const position = read(prim.attributes.POSITION, Float32Array, 3)
  const iacc = json.accessors[prim.indices]
  const IdxType = iacc.componentType === 5125 ? Uint32Array : Uint16Array
  const index = read(prim.indices, IdxType, 1)
  return { position: Float32Array.from(position), index: Array.from(index) }
}

// ---------- procedural paint ----------
function paint(geo) {
  geo.computeVertexNormals()
  geo.computeBoundingBox()
  const pos = geo.attributes.position, bb = geo.boundingBox, n = pos.count
  const col = new Float32Array(n * 3)
  const fluff = new THREE.Color('#f8f6f1')   // warm white lint
  const husk = new THREE.Color('#8a6a45')    // dried bract
  const tmp = new THREE.Color()
  const sm = t => t * t * (3 - 2 * t)
  const cl = v => (v < 0 ? 0 : v > 1 ? 1 : v)
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const ty = (y - bb.min.y) / (bb.max.y - bb.min.y)
    const radial = Math.hypot(x, z)
    // lint above, husk below; splayed-and-low goes further toward husk
    let k = sm(cl((ty - 0.30) / 0.22))
    k *= sm(cl(1 - ((radial - 0.55) / 0.45) * (1 - ty)))
    tmp.copy(husk).lerp(fluff, k)
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return geo
}

// ---------- write a GLB with POSITION / NORMAL / COLOR_0 / indices ----------
function writeGlb(geo, out) {
  const pos = geo.attributes.position.array
  const nor = geo.attributes.normal.array
  const col = geo.attributes.color.array
  const idx = geo.index.array
  const useShort = geo.attributes.position.count < 65536
  const idxArr = useShort ? Uint16Array.from(idx) : Uint32Array.from(idx)

  const pad4 = n => (n + 3) & ~3
  const parts = [
    { data: Buffer.from(pos.buffer, pos.byteOffset, pos.byteLength) },
    { data: Buffer.from(nor.buffer, nor.byteOffset, nor.byteLength) },
    { data: Buffer.from(col.buffer, col.byteOffset, col.byteLength) },
    { data: Buffer.from(idxArr.buffer, idxArr.byteOffset, idxArr.byteLength) },
  ]
  let offset = 0
  for (const p of parts) { p.offset = offset; offset = pad4(offset + p.data.length) }
  const bin = Buffer.alloc(offset)
  for (const p of parts) p.data.copy(bin, p.offset)

  const bb = geo.boundingBox
  const count = geo.attributes.position.count
  const json = {
    asset: { version: '2.0', generator: 'bake-cotton.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3 }] }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: parts.map((p, i) => ({
      buffer: 0, byteOffset: p.offset, byteLength: p.data.length,
      target: i === 3 ? 34963 : 34962,
    })),
    accessors: [
      { bufferView: 0, componentType: 5126, count, type: 'VEC3',
        min: [bb.min.x, bb.min.y, bb.min.z], max: [bb.max.x, bb.max.y, bb.max.z] },
      { bufferView: 1, componentType: 5126, count, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count, type: 'VEC3' },
      { bufferView: 3, componentType: useShort ? 5123 : 5125, count: idxArr.length, type: 'SCALAR' },
    ],
  }
  let jsonBuf = Buffer.from(JSON.stringify(json), 'utf8')
  while (jsonBuf.length % 4) jsonBuf = Buffer.concat([jsonBuf, Buffer.from(' ')])

  const header = Buffer.alloc(12)
  header.write('glTF', 0); header.writeUInt32LE(2, 4)
  header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + bin.length, 8)
  const jHead = Buffer.alloc(8); jHead.writeUInt32LE(jsonBuf.length, 0); jHead.write('JSON', 4)
  const bHead = Buffer.alloc(8); bHead.writeUInt32LE(bin.length, 0); bHead.write('BIN\0', 4)
  writeFileSync(out, Buffer.concat([header, jHead, jsonBuf, bHead, bin]))
}

const { position, index } = readGlb(SRC)
const base = new THREE.BufferGeometry()
base.setAttribute('position', new THREE.BufferAttribute(position, 3))
base.setIndex(index)
console.log(`source: ${base.attributes.position.count} verts, ${index.length / 3} tris`)

writeGlb(paint(base.clone()), 'public/cotton-boll-hi.glb')

const target = Math.floor(base.attributes.position.count * (1 - LO_KEEP))
const lo = new SimplifyModifier().modify(base.clone(), target)
writeGlb(paint(lo), 'public/cotton-boll-lo.glb')
console.log(`lo: ${lo.attributes.position.count} verts, ${lo.index.count / 3} tris`)
