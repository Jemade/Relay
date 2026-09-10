import React, { useState, useEffect } from 'react'


export function Topbar({
  onOpenSidebar,
  activeTab,
  activeThread,
  onRenameThread,
  onDuplicateThread,
  onArchiveThread,
  onGradeThread,
  health,
  onUpdateApiKey,
  onShowToast
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [keyInput, setKeyInput] = useState('')

  useEffect(() => {
    const handleOpenModal = () => {
      setStatusOpen(true)
      setMoreOpen(false)
    }
    window.addEventListener('relay:open-engine-settings', handleOpenModal)
    return () => window.removeEventListener('relay:open-engine-settings', handleOpenModal)
  }, [])

  const getBreadcrumbTitle = () => {
    if (activeTab === 'signals') return 'Signals'
    if (activeTab === 'library') return 'Library'
    if (activeTab === 'scorecards') return 'Multi-Agent Scorecards'
    return activeThread?.title || 'Thread'
  }

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return
    try {
      await onUpdateApiKey({
        api_key: keyInput.trim()
      })
      setKeyInput('')
      setStatusOpen(false)
      onShowToast('API Key configured! Live Engine Active')
    } catch {
      onShowToast('Failed to configure API key')
    }
  }

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="icon-button menu-button" onClick={onOpenSidebar} aria-label="Open navigation">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className="breadcrumbs">
          <span>{activeTab === 'threads' ? 'Threads' : 'Workspace'}</span>
          <span className="crumb-separator">/</span>
          <strong>{getBreadcrumbTitle()}</strong>
        </div>
      </div>

      <div className="topbar-actions">
        <button
          className="model-status-pill"
          onClick={() => { setStatusOpen(!statusOpen); setMoreOpen(false); }}
          title="Engine Status & Key Configuration"
          aria-label="Engine status"
        >
          <svg className="model-sparkle-svg" viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5L8 0Z" />
          </svg>
          <span className="model-title-text">
            {health?.llm_engine?.live_llm_ready ? 'Live AI' : 'Standard Engine'}
          </span>
          <span className={`model-live-badge ${health?.llm_engine?.live_llm_ready ? 'live' : 'standby'}`}>
            {health?.llm_engine?.live_llm_ready ? 'ACTIVE' : 'STANDBY'}
          </span>
        </button>

        {statusOpen && (
          <div className="popover status-popover visible">
            <div className="engine-status-header">
              <div className="engine-status-title-row">
                <svg className="model-sparkle-svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                  <path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5L8 0Z" />
                </svg>
                <strong>RELAY AI Engine</strong>
              </div>
              <span className={`model-live-badge ${health?.llm_engine?.live_llm_ready ? 'live' : 'standby'}`}>
                {health?.llm_engine?.live_llm_ready ? 'CONNECTED' : 'STANDBY'}
              </span>
            </div>

            <div className="engine-details-list">
              <div className="engine-detail-row">
                <span>Orchestrator:</span>
                <span>LangGraph StateGraph</span>
              </div>
              <div className="engine-detail-row">
                <span>Output Schema:</span>
                <span>Pydantic v2 (Strict)</span>
              </div>
              <div className="engine-detail-row">
                <span>Database:</span>
                <span>{health?.database || 'connected'}</span>
              </div>
              <div className="engine-detail-row">
                <span>Engine Status:</span>
                <span>{health?.llm_engine?.live_llm_ready ? 'Operational · Ready' : 'Standby Mode'}</span>
              </div>
            </div>

            <div className="api-key-edit-section">
              <label>Universal AI API Key</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="password"
                    placeholder="Enter API key for any model..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="key-input"
                  />
                  <button onClick={handleSaveKey} className="key-save-button">
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          className="icon-button"
          onClick={() => { setMoreOpen(!moreOpen); setStatusOpen(false); }}
          aria-label="More options"
          aria-expanded={moreOpen}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="19" cy="12" r="2"/>
          </svg>
        </button>

        {moreOpen && (
          <div className="popover menu-popover visible">
            <button onClick={() => { setMoreOpen(false); onGradeThread(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>Grade thread (LangGraph)</span>
            </button>
            <button onClick={() => { setMoreOpen(false); onRenameThread(); }}>
              Rename thread
            </button>
            <button onClick={() => { setMoreOpen(false); onDuplicateThread(); }}>
              Duplicate thread
            </button>
            <button onClick={() => { setMoreOpen(false); onArchiveThread(); }}>
              Archive thread
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
