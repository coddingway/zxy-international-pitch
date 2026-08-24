/**
 * Converts a front-facing orthographic globe render (circle on transparent bg)
 * into a proper 2:1 equirectangular texture for Three.js sphere mapping.
 *
 * Front hemisphere: sampled directly via orthographic unproject.
 * Back hemisphere:  mirrored from the opposite front point (horizontally symmetric).
 */
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { writeFileSync } from 'fs'

const OUT_W = 2048
const OUT_H = 1024

async function main() {
  const src = await loadImage('src/assets/globe-front.png')
  const SW = src.width   // 1024
  const SH = src.height  // 1024

  // Sample source into a pixel buffer
  const srcCanvas = createCanvas(SW, SH)
  const srcCtx = srcCanvas.getContext('2d')
  srcCtx.drawImage(src, 0, 0)
  const srcData = srcCtx.getImageData(0, 0, SW, SH).data

  // Auto-detect globe circle: scan horizontal center row for opaque pixels
  const srcTmp = createCanvas(SW, SH)
  srcTmp.getContext('2d').drawImage(src, 0, 0)
  const rowData = srcTmp.getContext('2d').getImageData(0, SH >> 1, SW, 1).data
  let left = 0, right = SW - 1
  while (left < SW && rowData[left * 4 + 3] < 10) left++
  while (right > 0 && rowData[right * 4 + 3] < 10) right--
  const cx = (left + right) / 2
  const cy = SH / 2
  const r  = (right - left) / 2 * 0.99  // 1% inset to avoid fringe

  // Output canvas
  const outCanvas = createCanvas(OUT_W, OUT_H)
  const outCtx = outCanvas.getContext('2d')
  const outImg = outCtx.createImageData(OUT_W, OUT_H)
  const out = outImg.data

  function sampleSrc(sx, sy) {
    // sx, sy in [-1, 1] (sphere face coords, y-up)
    const px = Math.round(cx + sx * r)
    const py = Math.round(cy - sy * r)  // flip y (image y-down)
    if (px < 0 || px >= SW || py < 0 || py >= SH) return null
    const i = (py * SW + px) * 4
    if (srcData[i + 3] < 10) return null  // transparent — outside globe
    return i
  }

  for (let oy = 0; oy < OUT_H; oy++) {
    const lat = (0.5 - oy / OUT_H) * Math.PI          // π/2 … -π/2

    for (let ox = 0; ox < OUT_W; ox++) {
      // Three.js SphereGeometry: u=0 → front (z+), u=0.5 → back (z-)
      const lon = (ox / OUT_W) * 2 * Math.PI           // 0 … 2π

      // 3-D unit vector on sphere (Y-up, Z-toward-camera)
      const nx = Math.cos(lat) * Math.sin(lon)
      const ny = Math.sin(lat)
      const nz = Math.cos(lat) * Math.cos(lon)

      // Front hemisphere: sample directly; back: mirror horizontally
      const sx = nz >= 0 ? nx : -nx
      const sy = ny

      const oi = (oy * OUT_W + ox) * 4
      const si = sampleSrc(sx, sy)

      if (si !== null) {
        out[oi]     = srcData[si]
        out[oi + 1] = srcData[si + 1]
        out[oi + 2] = srcData[si + 2]
        out[oi + 3] = 255
      } else {
        // Fallback: deep ocean blue (matches globe edge color)
        out[oi]     = 15
        out[oi + 1] = 55
        out[oi + 2] = 120
        out[oi + 3] = 255
      }
    }
  }

  outCtx.putImageData(outImg, 0, 0)
  writeFileSync('public/globe-equirect.png', outCanvas.toBuffer('image/png'))
  console.log(`Done → public/globe-equirect.png  (${OUT_W}×${OUT_H})`)
}

main().catch(e => { console.error(e); process.exit(1) })
