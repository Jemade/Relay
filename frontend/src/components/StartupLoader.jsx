import React, { useEffect, useState } from 'react'

export function StartupLoader({ onDone }) {
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDone(true)
      if (onDone) onDone()
    }, 1200) // Smooth, pleasant 1.2s loader transition
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className={`startup-loader ${done ? 'done' : ''}`} aria-label="Loading RELAY">
      <svg className="loader-mark" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 7h9c7 0 7 9 0 9h-7l12 11" />
      </svg>
      <div className="loader-wordmark">RELAY</div>
      <div className="loader-track"><span></span></div>
    </div>
  )
}
