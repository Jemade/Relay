import React from 'react'

export function ScorecardView({ scorecard, onClose }) {
  if (!scorecard) {
    return (
      <div className="workspace-view">
        <div className="workspace-view-header">
          <div>
            <p className="eyebrow">Multi-Agent Grading Pipeline</p>
            <h2>No scorecards yet</h2>
          </div>
          <button className="back-button" onClick={onClose}>Back to thread</button>
        </div>
        <p style={{ color: 'var(--muted)' }}>
          Select a thread and click "Grade thread (LangGraph)" to run the multi-agent grading state graph.
        </p>
      </div>
    )
  }

  return (
    <div className="workspace-view">
      <div className="workspace-view-header">
        <div>
          <p className="eyebrow">LangGraph Multi-Agent StateGraph</p>
          <h2>Evaluation Scorecard</h2>
        </div>
        <button className="back-button" onClick={onClose}>Back to thread</button>
      </div>

      <div className="workspace-grid" style={{ display: 'block' }}>
        <article className="scorecard-card">
          <div className="scorecard-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="grade-badge-huge">{scorecard.grade_letter}</div>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px' }}>{scorecard.headline}</h3>
                <span className="card-meta">
                  Score: {scorecard.overall_score}/100 · State: {scorecard.momentum_factor}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: 'var(--faint)', fontFamily: 'DM Mono, monospace' }}>
                {scorecard.timestamp ? new Date(scorecard.timestamp).toLocaleString() : 'Recent'}
              </span>
            </div>
          </div>

          <div className="scorecard-stats-grid">
            <div className="stat-box">
              <small>Composite Grade</small>
              <strong>{scorecard.overall_score} <span style={{ fontSize: '12px', color: 'var(--faint)' }}>/ 100</span></strong>
            </div>
            <div className="stat-box">
              <small>Momentum Factor</small>
              <strong>{scorecard.momentum_factor}</strong>
            </div>
            <div className="stat-box">
              <small>Calm & Focus Index</small>
              <strong>{scorecard.calm_index || 92} <span style={{ fontSize: '12px', color: 'var(--faint)' }}>/ 100</span></strong>
            </div>
          </div>

          <h4 style={{ margin: '16px 0 10px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--faint)', fontFamily: 'DM Mono, monospace' }}>
            Rubric Dimensions
          </h4>
          <div className="rubric-list">
            {scorecard.rubric_breakdown?.map((rubric, idx) => (
              <div className="rubric-row" key={idx}>
                <div className="rubric-row-header">
                  <span>{rubric.criterion}</span>
                  <span>{rubric.score}%</span>
                </div>
                <div className="rubric-bar">
                  <span style={{ width: `${Math.min(100, Math.max(0, rubric.score))}%` }}></span>
                </div>
                <p className="rubric-reasoning">{rubric.reasoning}</p>
                {rubric.strengths?.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{rubric.strengths.join(' · ')}</span>
                  </div>
                )}
                {rubric.weaknesses?.length > 0 && (
                  <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>{rubric.weaknesses.join(' · ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {scorecard.specialist_reviews?.length > 0 && (
            <>
              <h4 style={{ margin: '24px 0 10px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--faint)', fontFamily: 'DM Mono, monospace' }}>
                Specialist Agent Findings
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {scorecard.specialist_reviews.map((spec, idx) => (
                  <div key={idx} style={{ background: 'var(--surface-muted)', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '12px' }}>{spec.agent_role}</strong>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--accent)' }}>
                        {spec.composite_score}%
                      </span>
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--muted)' }}>
                      {spec.summary}
                    </p>
                    {spec.signals_detected?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {spec.signals_detected.map((s, sIdx) => (
                          <span key={sIdx} style={{ fontSize: '10px', padding: '2px 5px', background: 'var(--surface)', borderRadius: '3px', color: 'var(--faint)' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {scorecard.recommended_next_steps?.length > 0 && (
            <div style={{ marginTop: '22px', padding: '14px', background: 'var(--accent-soft)', borderRadius: '6px', borderLeft: '3px solid var(--accent)' }}>
              <strong style={{ display: 'block', fontSize: '12px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '6px', fontFamily: 'DM Mono, monospace' }}>
                Recommended Momentum Steps
              </strong>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: 'var(--text)' }}>
                {scorecard.recommended_next_steps.map((rec, rIdx) => (
                  <li key={rIdx} style={{ marginBottom: '4px' }}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </article>
      </div>
    </div>
  )
}
