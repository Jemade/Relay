import React, { useState } from 'react'

export function Sidebar({
  isOpen,
  onClose,
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  activeTab,
  onSelectTab,
  metrics,
  userName,
  onUpdateUserName,
  onShowToast
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(userName || 'Operator')

  const initials = (userName || 'Operator')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleSaveName = (e) => {
    e.preventDefault()
    if (nameInput.trim()) {
      onUpdateUserName(nameInput.trim())
      setEditingName(false)
      onShowToast('Profile name updated')
    }
  }

  const capacityPct = metrics?.capacity_used_pct || 0
  const tokenDisplay = metrics?.total_tokens
    ? `${metrics.total_tokens.toLocaleString()} tokens processed`
    : '0 tokens processed'

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
      <div className="sidebar-top">
        <a className="brand-lockup" href="#" onClick={(e) => { e.preventDefault(); onSelectTab('threads'); }} aria-label="RELAY home">
          <svg className="relay-mark" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M8 7h9c7 0 7 9 0 9h-7l12 11" />
          </svg>
          <span className="wordmark">RELAY</span>
        </a>
        <button className="icon-button mobile-close" onClick={onClose} aria-label="Close navigation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <button className="new-thread" onClick={onNewThread} id="newThread">
        <span className="plus" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </span>
        <span>New thread</span>
        <kbd>⌘ K</kbd>
      </button>

      <nav className="nav-section" aria-label="Main navigation">
        <p className="nav-label">Workspace</p>
        <button
          className={`nav-item ${activeTab === 'threads' ? 'active' : ''}`}
          onClick={() => { onSelectTab('threads'); onClose(); }}
        >
          <span className="nav-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </span>
          <span>Threads</span>
          <span className="nav-count">{threads.length}</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'signals' ? 'active' : ''}`}
          onClick={() => { onSelectTab('signals'); onClose(); }}
        >
          <span className="nav-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </span>
          <span>Signals</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => { onSelectTab('library'); onClose(); }}
        >
          <span className="nav-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </span>
          <span>Library</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'scorecards' ? 'active' : ''}`}
          onClick={() => { onSelectTab('scorecards'); onClose(); }}
        >
          <span className="nav-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </span>
          <span>Scorecards</span>
        </button>
      </nav>

      <div className="recent-section">
        <p className="nav-label">Recent</p>
        {threads.length > 0 ? (
          threads.map((t) => (
            <button
              key={t.id}
              className={`thread-item ${activeThreadId === t.id && activeTab === 'threads' ? 'selected' : ''}`}
              onClick={() => {
                onSelectThread(t.id)
                onSelectTab('threads')
                onClose()
              }}
            >
              <span className="thread-dot"></span>
              <span className="thread-title">{t.title}</span>
            </button>
          ))
        ) : (
          <p style={{ padding: '8px 10px', margin: 0, fontSize: '12px', color: 'var(--faint)' }}>
            No conversations yet
          </p>
        )}
      </div>

      <div className="sidebar-bottom">
        <div className="usage-card">
          <div className="usage-heading">
            <span>Relay capacity</span>
            <span>{capacityPct}%</span>
          </div>
          <div className="usage-track">
            <span style={{ width: `${capacityPct}%` }}></span>
          </div>
          <p>{tokenDisplay}</p>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            className="profile"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-expanded={profileOpen}
          >
            <span className="avatar">{initials}</span>
            <span className="profile-copy">
              <strong>{userName || 'Operator'}</strong>
            </span>
            <span className="more" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="19" cy="12" r="2"/>
              </svg>
            </span>
          </button>

          {profileOpen && (
            <div className="popover profile-popover visible">
              {editingName ? (
                <form onSubmit={handleSaveName} style={{ marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your name"
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      fontSize: '12px',
                      border: '1px solid var(--line)',
                      borderRadius: '4px',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      marginBottom: '6px'
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="submit"
                      style={{
                        padding: '4px 8px',
                        background: 'var(--accent)',
                        color: '#fff',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <strong>{userName || 'Operator'}</strong>
                  <button onClick={() => setEditingName(true)}>
                    Edit Profile Name
                  </button>
                  <button onClick={() => { setProfileOpen(false); onShowToast('Workspace ready'); }}>
                    Session Active
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
