import React, { useState } from 'react'

export function LandingPage({ onEnter }) {
  const [leaving, setLeaving] = useState(false)

  const handleEnter = () => {
    setLeaving(true)
    setTimeout(() => {
      onEnter()
    }, 320)
  }

  return (
    <section className={`landing-page ${leaving ? 'leaving' : ''}`} aria-labelledby="landingTitle">
      <main className="landing-main">
        <p className="landing-kicker">REAL TIME AI IN MOTION</p>
        <h1 id="landingTitle">Ideas in.<br /><em>Momentum out.</em></h1>
        <p className="landing-copy">RELAY is a calm, continuous space for turning unfinished thoughts into useful next steps.</p>
        <button className="landing-cta" onClick={handleEnter} id="enterRelay" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span>Enter RELAY</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"/>
            <polyline points="7 7 17 7 17 17"/>
          </svg>
        </button>
        <p className="landing-note">A focused workspace for thinking, making, and moving forward.</p>
      </main>
      <footer className="landing-footer">
        <span>Built for the handoff between thought and action.</span>
        <span>© 2026 RELAY</span>
      </footer>
    </section>
  )
}
