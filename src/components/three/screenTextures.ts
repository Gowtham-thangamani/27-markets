import * as THREE from 'three'

/**
 * Offscreen-canvas textures used as emissive screen maps on the 3D devices.
 * Drawing the UI to a canvas keeps the screens crisp and lets bloom pick up
 * the bright candles / lines as a real glow.
 */

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const CANDLES = [
  { o: 0.62, c: 0.42, h: 0.34, l: 0.68, up: true },
  { o: 0.46, c: 0.54, h: 0.4, l: 0.6, up: false },
  { o: 0.52, c: 0.36, h: 0.3, l: 0.58, up: true },
  { o: 0.4, c: 0.48, h: 0.34, l: 0.54, up: false },
  { o: 0.44, c: 0.28, h: 0.22, l: 0.5, up: true },
  { o: 0.32, c: 0.4, h: 0.26, l: 0.46, up: false },
  { o: 0.36, c: 0.24, h: 0.18, l: 0.42, up: true },
  { o: 0.28, c: 0.34, h: 0.22, l: 0.4, up: false },
  { o: 0.32, c: 0.2, h: 0.14, l: 0.36, up: true },
  { o: 0.24, c: 0.3, h: 0.18, l: 0.34, up: false },
  { o: 0.28, c: 0.16, h: 0.1, l: 0.32, up: true },
]

function drawChart(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 1
  for (let i = 1; i < 5; i++) {
    const gy = y + (h / 5) * i
    ctx.beginPath()
    ctx.moveTo(x, gy)
    ctx.lineTo(x + w, gy)
    ctx.stroke()
  }

  const cw = w / CANDLES.length
  CANDLES.forEach((c, i) => {
    const cx = x + cw * i + cw / 2
    const color = c.up ? '#22c55e' : '#e11d2e'
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = Math.max(1, cw * 0.06)
    // wick
    ctx.beginPath()
    ctx.moveTo(cx, y + h * c.h)
    ctx.lineTo(cx, y + h * c.l)
    ctx.stroke()
    // body
    const top = y + h * Math.min(c.o, c.c)
    const bh = Math.max(2, h * Math.abs(c.o - c.c))
    ctx.fillRect(cx - cw * 0.28, top, cw * 0.56, bh)
  })

  // glowing trend line
  const grad = ctx.createLinearGradient(x, 0, x + w, 0)
  grad.addColorStop(0, 'rgba(225,29,46,0.3)')
  grad.addColorStop(1, '#ff5663')
  ctx.strokeStyle = grad
  ctx.lineWidth = Math.max(2, w * 0.006)
  ctx.shadowColor = '#e11d2e'
  ctx.shadowBlur = 12
  ctx.beginPath()
  CANDLES.forEach((c, i) => {
    const cx = x + cw * i + cw / 2
    const cy = y + h * (c.c - 0.06)
    if (i === 0) ctx.moveTo(cx, cy)
    else ctx.lineTo(cx, cy)
  })
  ctx.stroke()
  ctx.shadowBlur = 0
}

function makeTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  draw(ctx)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Laptop trading terminal screen. */
export function makeLaptopScreenTexture(): THREE.CanvasTexture {
  const W = 1024
  const H = 640
  return makeTexture(W, H, (ctx) => {
    ctx.fillStyle = '#070708'
    ctx.fillRect(0, 0, W, H)

    // top bar
    ctx.fillStyle = '#0e0e10'
    ctx.fillRect(0, 0, W, 70)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 30px Inter, sans-serif'
    ctx.fillText('EUR/USD', 36, 46)
    ctx.fillStyle = 'rgba(34,197,94,0.18)'
    rounded(ctx, 210, 22, 92, 32, 8)
    ctx.fill()
    ctx.fillStyle = '#22c55e'
    ctx.font = 'bold 20px Inter, sans-serif'
    ctx.fillText('+0.18%', 224, 44)
    // window dots
    ;['#e11d2e', '#3a3a3a', '#3a3a3a'].forEach((c, i) => {
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.arc(W - 40 - i * 26, 36, 6, 0, Math.PI * 2)
      ctx.fill()
    })

    // chart area
    drawChart(ctx, 36, 110, W - 320, H - 170)

    // right watchlist
    const items = [
      ['EUR/USD', '1.0842', '#22c55e'],
      ['XAU/USD', '2348.6', '#22c55e'],
      ['BTC/USD', '64,280', '#22c55e'],
      ['US100', '19,842', '#e11d2e'],
      ['GBP/USD', '1.2731', '#e11d2e'],
    ]
    const px = W - 260
    items.forEach((it, i) => {
      const py = 130 + i * 92
      ctx.fillStyle = '#101012'
      rounded(ctx, px, py, 224, 74, 12)
      ctx.fill()
      ctx.fillStyle = '#9ca3af'
      ctx.font = '600 20px Inter, sans-serif'
      ctx.fillText(it[0], px + 18, py + 30)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 26px Inter, sans-serif'
      ctx.fillText(it[1], px + 18, py + 58)
      ctx.fillStyle = it[2]
      ctx.beginPath()
      ctx.arc(px + 200, py + 37, 5, 0, Math.PI * 2)
      ctx.fill()
    })
  })
}

/** Phone portfolio screen. */
export function makePhoneScreenTexture(): THREE.CanvasTexture {
  const W = 540
  const H = 1100
  return makeTexture(W, H, (ctx) => {
    ctx.fillStyle = '#070708'
    ctx.fillRect(0, 0, W, H)

    // notch
    ctx.fillStyle = '#1a1a1c'
    rounded(ctx, W / 2 - 70, 28, 140, 16, 8)
    ctx.fill()

    ctx.fillStyle = '#9ca3af'
    ctx.font = '500 26px Inter, sans-serif'
    ctx.fillText('Portfolio', 40, 110)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 56px Inter, sans-serif'
    ctx.fillText('$25,430.50', 40, 170)
    ctx.fillStyle = '#22c55e'
    ctx.font = '600 26px Inter, sans-serif'
    ctx.fillText('▲ +2.4% today', 40, 212)

    // chart
    drawChart(ctx, 40, 260, W - 80, 300)

    // holdings
    const rows = [
      ['BTC/USD', '+1.86%', '#22c55e'],
      ['ETH/USD', '+2.42%', '#22c55e'],
      ['US100', '-0.22%', '#e11d2e'],
      ['XAU/USD', '+0.86%', '#22c55e'],
    ]
    rows.forEach((r, i) => {
      const ry = 620 + i * 96
      ctx.fillStyle = '#101012'
      rounded(ctx, 40, ry, W - 80, 78, 14)
      ctx.fill()
      ctx.fillStyle = '#e5e7eb'
      ctx.font = '600 28px Inter, sans-serif'
      ctx.fillText(r[0], 64, ry + 50)
      ctx.fillStyle = r[2]
      ctx.font = 'bold 26px Inter, sans-serif'
      ctx.fillText(r[1], W - 180, ry + 50)
    })

    // CTA bar
    ctx.fillStyle = '#e11d2e'
    rounded(ctx, 40, H - 110, W - 80, 64, 16)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Trade Now', W / 2, H - 68)
    ctx.textAlign = 'left'
  })
}
