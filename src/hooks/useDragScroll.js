import { useRef, useEffect } from 'react'

export function useDragScroll(ref) {
  const state = useRef({ isDown: false, startX: 0, scrollLeft: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function onMouseDown(e) {
      state.current.isDown = true
      state.current.startX = e.pageX - el.offsetLeft
      state.current.scrollLeft = el.scrollLeft
      el.style.cursor = 'grabbing'
      el.style.userSelect = 'none'
    }

    function onMouseUp() {
      state.current.isDown = false
      el.style.cursor = 'grab'
      el.style.userSelect = ''
    }

    function onMouseMove(e) {
      if (!state.current.isDown) return
      e.preventDefault()
      const x = e.pageX - el.offsetLeft
      const walk = (x - state.current.startX) * 1.5
      el.scrollLeft = state.current.scrollLeft - walk
    }

    function onMouseLeave() {
      state.current.isDown = false
      el.style.cursor = 'grab'
      el.style.userSelect = ''
    }

    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('mouseup', onMouseUp)
    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mouseleave', onMouseLeave)

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [ref])
}
