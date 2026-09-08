import React, { useRef, useState } from 'react'

export function Composer({
  onSendMessage,
  onStopGeneration,
  isGenerating,
  onShowToast
}) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState([])
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)

  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleInput = (e) => {
    setText(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    if ((!text.trim() && attachments.length === 0) || isGenerating) return

    let finalContent = text.trim()
    if (attachments.length > 0) {
      const attachmentsText = attachments
        .map((a) => `[Attached File: ${a.name} (${a.size})]\n\`\`\`\n${a.content}\n\`\`\``)
        .join('\n\n')
      finalContent = attachmentsText + (finalContent ? `\n\n${finalContent}` : '')
    }

    onSendMessage(finalContent)
    setText('')
    setAttachments([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSelectSuggestion = (suggestionText) => {
    setText(suggestionText)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target.result
        const sizeStr = file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`

        setAttachments((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            size: sizeStr,
            content: typeof content === 'string' ? content : ''
          }
        ])
        onShowToast(`Attached ${file.name} (${sizeStr})`)
      }
      reader.readAsText(file)
    })
    e.target.value = ''
    setPlusMenuOpen(false)
  }

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const insertTemplate = (template) => {
    setText((prev) => (prev ? `${prev}\n\n${template}` : template))
    setPlusMenuOpen(false)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  return (
    <div className="composer-wrap">
      <div className="suggestions">
        <button className="suggestion" onClick={() => handleSelectSuggestion('Turn this into a brief')}>
          <span>Turn this into a brief</span>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '5px' }}>
            <line x1="7" y1="17" x2="17" y2="7"/>
            <polyline points="7 7 17 7 17 17"/>
          </svg>
        </button>
        <button className="suggestion" onClick={() => handleSelectSuggestion('Explore the tension')}>
          <span>Explore the tension</span>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '5px' }}>
            <line x1="7" y1="17" x2="17" y2="7"/>
            <polyline points="7 7 17 7 17 17"/>
          </svg>
        </button>
        <button className="suggestion" onClick={() => handleSelectSuggestion('Make it sharper')}>
          <span>Make it sharper</span>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '5px' }}>
            <line x1="7" y1="17" x2="17" y2="7"/>
            <polyline points="7 7 17 7 17 17"/>
          </svg>
        </button>
      </div>

      {attachments.length > 0 && (
        <div className="composer-attachments-tray">
          {attachments.map((att) => (
            <div key={att.id} className="attachment-badge">
              <span className="attachment-icon">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </span>
              <span className="attachment-label">{att.name}</span>
              <button
                type="button"
                className="attachment-delete"
                onClick={() => removeAttachment(att.id)}
                aria-label="Remove attachment"
              >
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <form className="composer" onSubmit={handleSubmit} id="composer">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Relay a thought..."
          aria-label="Message RELAY"
        />

        <div className="composer-footer">
          <div className="composer-tools">
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                aria-label="Add attachment or template"
                className={`tool-icon-btn ${plusMenuOpen ? 'active' : ''}`}
                title="Add attachment or template"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              {plusMenuOpen && (
                <div className="popover plus-popover visible">
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click()
                      setPlusMenuOpen(false)
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    <span>Upload Document / File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplate("```python\n# Paste code to evaluate or debug\n\n```")}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    <span>Insert Code Snippet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplate("**Goal:** \n**Constraints:** \n**Next Action:** ")}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span>Executive Brief Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplate("1. Immediate priority: \n2. Key blocker: \n3. Success metric: ")}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 11 12 14 22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    <span>Action Plan Template</span>
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.py,.js,.jsx,.ts,.tsx,.json,.csv,.html,.css,.sql,.yaml,.yml,.sh,.log,.pdf"
              onChange={handleFileChange}
              hidden
            />

            <span className="stream-status-label">
              {isGenerating ? 'Relaying response · streaming tokens' : 'RELAY can make mistakes. Check important info.'}
            </span>
          </div>

          <div className="composer-actions">
            {isGenerating && (
              <button
                className="stop-button"
                type="button"
                onClick={onStopGeneration}
                aria-label="Stop generation"
              >
                Stop
              </button>
            )}
            <button
              className="send-button"
              type="submit"
              disabled={(!text.trim() && attachments.length === 0) || isGenerating}
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
