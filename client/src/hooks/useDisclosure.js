import { useCallback, useEffect, useState } from 'react'

export function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = useState(initial)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((current) => !current), [])

  return { isOpen, open, close, toggle, setIsOpen }
}

export function useOutsideClick(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return undefined

    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) handler(event)
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') handler(event)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [ref, handler, active])
}
