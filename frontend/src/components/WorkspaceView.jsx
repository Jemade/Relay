import React from 'react'

export function WorkspaceView({ type, cards, scorecards, onSelectScorecard, onClose }) {
  const getTitle = () => {
    if (type === 'signals') return 'Signals'
    if (type === 'library') return 'Library'
    if (type === 'scorecards') return 'Scorecards'
    return 'Workspace'
  }

  return (
    <section className="workspace-view" aria-labelledby="workspaceTitle">
      <div className="workspace-view-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2 id="workspaceTitle">{getTitle()}</h2>
        </div>
        <button className="back-button" onClick={onClose}>Back to thread</button>
      </div>

      <div className="workspace-grid">
        {type === 'scorecards' ? (
          scorecards && scorecards.length > 0 ? (
            scorecards.map((sc, idx) => (
              <article
                className="workspace-card"
                key={idx}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectScorecard(sc)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div className="grade-badge-huge" style={{ width: '36px', height: '36px', fontSize: '16px' }}>
                    {sc.grade_letter}
                  </div>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent)' }}>
                    {sc.overall_score}/100
                  </span>
                </div>
                <h3>{sc.headline}</h3>
                <p>{sc.momentum_factor} · Calm Index {sc.calm_index || 92}%</p>
                <span className="card-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{sc.timestamp ? new Date(sc.timestamp).toLocaleString() : 'Scorecard'} · Click to view full report</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7"/>
                    <polyline points="7 7 17 7 17 17"/>
                  </svg>
                </span>
              </article>
            ))
          ) : (
            <p style={{ color: 'var(--muted)' }}>No scorecards evaluated yet. Click "Grade thread" to run the multi-agent pipeline.</p>
          )
        ) : (
          cards && cards.length > 0 ? (
            cards.map((card, index) => (
              <article className="workspace-card" key={index}>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <span className="card-meta">{card.meta}</span>
              </article>
            ))
          ) : (
            <p style={{ color: 'var(--muted)', gridColumn: '1 / -1', padding: '12px 0' }}>
              {type === 'signals'
                ? 'No signals captured yet. Key insights from your conversations will appear here.'
                : 'No saved responses in your library yet. Star or save items to access them here.'}
            </p>
          )
        )}
      </div>
    </section>
  )
}
