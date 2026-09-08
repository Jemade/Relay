import React from 'react'

export function Toast({ message }) {
  if (!message) return null

  return (
    <div className={`toast ${message ? 'visible' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  )
}
