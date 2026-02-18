import { Resvg } from '@resvg/resvg-js'
import { writeFileSync } from 'fs'

const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="50%" stop-color="#16213e"/>
      <stop offset="100%" stop-color="#1a1a2e"/>
    </linearGradient>
    <radialGradient id="glow-blue" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(110,120,255,0.15)"/>
      <stop offset="70%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="glow-pink" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(230,66,152,0.12)"/>
      <stop offset="70%" stop-color="transparent"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Decorative accent circles -->
  <circle cx="1280" cy="-80" r="150" fill="url(#glow-blue)"/>
  <circle cx="-60" cy="690" r="125" fill="url(#glow-pink)"/>

  <!-- Node network logo -->
  <g transform="translate(560, 140)">
    <line x1="40" y1="0" x2="18" y2="30" stroke="rgba(110,120,255,0.5)" stroke-width="2"/>
    <line x1="40" y1="0" x2="62" y2="30" stroke="rgba(110,120,255,0.5)" stroke-width="2"/>
    <line x1="18" y1="30" x2="62" y2="30" stroke="rgba(110,120,255,0.5)" stroke-width="2"/>
    <line x1="40" y1="0" x2="40" y2="45" stroke="rgba(110,120,255,0.3)" stroke-width="2"/>
    <line x1="18" y1="30" x2="40" y2="45" stroke="rgba(110,120,255,0.3)" stroke-width="2"/>
    <line x1="62" y1="30" x2="40" y2="45" stroke="rgba(110,120,255,0.3)" stroke-width="2"/>
    <circle cx="40" cy="0" r="7" fill="#6E78FF"/>
    <circle cx="18" cy="30" r="6" fill="#8B93FF"/>
    <circle cx="62" cy="30" r="6" fill="#E64298"/>
    <circle cx="40" cy="45" r="5" fill="#B55ACA"/>
  </g>

  <!-- Title: Cambridge Innovation -->
  <text x="600" y="310" text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="800"
    fill="#e8e8e8" letter-spacing="-1">
    Cambridge Innovation
  </text>

  <!-- Title: Event Links Hub -->
  <text x="600" y="372" text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="800"
    fill="#6E78FF" letter-spacing="-1">
    Event Links Hub
  </text>

  <!-- Tagline -->
  <text x="600" y="430" text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif" font-size="22"
    fill="#a0a0b0" letter-spacing="0.5">
    All Cambridge innovation and startup event links in one place
  </text>
</svg>`

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
})
const pngData = resvg.render()
const pngBuffer = pngData.asPng()

writeFileSync(new URL('../public/og.png', import.meta.url), pngBuffer)
console.log(`Generated public/og.png (${pngBuffer.length} bytes)`)
