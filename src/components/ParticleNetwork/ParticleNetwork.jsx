import { useEffect, useRef } from 'react'

const PARTICLE_COUNT = 40
const CONNECTION_DISTANCE = 140
const PARTICLE_SPEED = 0.12
const HUE_CYCLE_SPEED = 0.00015

export default function ParticleNetwork() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animationId
    let particles = []
    let time = 0

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    function createParticles() {
      particles = []
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * PARTICLE_SPEED,
          vy: (Math.random() - 0.5) * PARTICLE_SPEED,
          radius: Math.random() * 2 + 1,
          hueOffset: Math.random() * Math.PI * 2,
        })
      }
    }

    function getColor(hueOffset, alpha) {
      const dark = document.documentElement.dataset.theme === 'dark'
      const t = (Math.sin(time * HUE_CYCLE_SPEED + hueOffset) + 1) / 2
      const r = Math.round((dark ? 140 : 110) + t * (dark ? 80 : 120))
      const g = Math.round((dark ? 150 : 120) - t * (dark ? 30 : 54))
      const b = Math.round(255 - t * (dark ? 50 : 103))
      return `rgba(${r}, ${g}, ${b}, ${dark ? alpha * 1.3 : alpha})`
    }

    function animate() {
      time++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = getColor(p.hueOffset, 0.6)
        ctx.fill()

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]
          const dx = p.x - q.x
          const dy = p.y - q.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < CONNECTION_DISTANCE) {
            const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.15
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.strokeStyle = getColor((p.hueOffset + q.hueOffset) / 2, alpha)
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      animationId = requestAnimationFrame(animate)
    }

    resize()
    createParticles()

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = getColor(p.hueOffset, 0.6)
        ctx.fill()
      }
    } else {
      animate()
    }

    function handleResize() {
      resize()
      createParticles()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="particle-network"
      aria-hidden="true"
    />
  )
}
