// Scroll-scrubbed image sequence on a canvas.
//
// Why not <video> + currentTime: every assignment starts an async seek, and a new
// one aborts the in-flight seek. Driven from scroll (up to 60 assignments/sec) the
// decoder thrashes and few seeks ever land, which reads as stutter — the all-intra
// re-encode cut seek *cost* but not that. Blitting a decoded image is sub-millisecond
// and always lands on the exact frame.

export function createFrameSequence({ canvas, count, url, onProgress }) {
  const frames = new Array(count)
  let loaded = 0
  let lastIndex = -1
  let disposed = false

  // Load in scroll order with limited concurrency. Firing all N requests at once
  // saturates the connection pool, so the tail of the sequence starves — the
  // frames you reach last are the ones that arrive last. A small window keeps
  // the browser working strictly front-to-back, which is the order they're needed.
  const CONCURRENCY = 8
  let next = 0

  function pump() {
    if (disposed || next >= count) return
    const i = next++
    const img = new Image()
    img.decoding = 'async'
    frames[i] = img
    const done = () => {
      loaded++
      onProgress?.(loaded / count)
      if (lastIndex === -1) draw(0) // first frame in: paint something immediately
      pump()
    }
    img.onload = done
    img.onerror = done // a gap must not stall the queue; draw() skips back instead
    img.src = url(i + 1)
  }

  for (let k = 0; k < Math.min(CONCURRENCY, count); k++) pump()

  const ready = img => img && img.complete && img.naturalWidth > 0

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!w || !h) return
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr)
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw
      canvas.height = bh
      lastIndex = -1 // backing store cleared, force a repaint
    }
  }

  function paint(img) {
    const ctx = canvas.getContext('2d')
    const cw = canvas.width, ch = canvas.height
    ctx.clearRect(0, 0, cw, ch)
    // `contain` — whole frame visible, never cropped or zoomed
    const s = Math.min(cw / img.naturalWidth, ch / img.naturalHeight)
    const w = img.naturalWidth * s, h = img.naturalHeight * s
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h)
  }

  // p in [0,1]. Falls back to the nearest already-loaded frame so scrubbing
  // never blanks while the tail of the sequence is still downloading.
  function draw(p) {
    if (disposed) return
    resize()
    const target = Math.max(0, Math.min(count - 1, Math.round(p * (count - 1))))
    let i = target
    if (!ready(frames[i])) {
      let back = -1
      for (let j = target; j >= 0; j--) if (ready(frames[j])) { back = j; break }
      if (back === -1) return
      i = back
    }
    if (i === lastIndex) return
    lastIndex = i
    paint(frames[i])
  }

  return {
    draw,
    dispose() {
      disposed = true
      for (const img of frames) { if (img) { img.onload = null; img.onerror = null; img.src = '' } }
    },
  }
}
