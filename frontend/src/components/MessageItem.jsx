import React, { useState, useEffect } from 'react'


function renderMarkdown(content) {
  const lines = content.split('\n')
  const elements = []
  let inCode = false
  let codeBuffer = []
  let inCallout = false
  let calloutBuffer = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('```')) {
      if (inCode) {
        elements.push(
          <pre key={`code-${i}`}>
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        )
        codeBuffer = []
      }
      inCode = !inCode
      continue
    }

    if (inCode) {
      codeBuffer.push(line)
      continue
    }

    if (line.startsWith('> [!NOTE]') || line.startsWith('>')) {
      const clean = line.replace(/^>\s*(\[!NOTE\])?/, '').trim()
      if (clean) calloutBuffer.push(clean)
      inCallout = true
      continue
    } else if (inCallout) {
      elements.push(
        <div className="callout" key={`callout-${i}`}>
          <span className="callout-mark">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </span>
          <div>
            {calloutBuffer.map((c, idx) => (
              <p key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(c) }} />
            ))}
          </div>
        </div>
      )
      calloutBuffer = []
      inCallout = false
    }

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i}>{line.slice(4)}</h3>)
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(
        <p key={i} style={{ paddingLeft: '14px' }} dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }} />
      )
    } else if (line.startsWith('- ')) {
      elements.push(
        <p key={i} style={{ paddingLeft: '14px' }} dangerouslySetInnerHTML={{ __html: `• ${inlineMarkdown(line.slice(2))}` }} />
      )
    } else if (line.trim()) {
      elements.push(
        <p key={i} dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }} />
      )
    }
  }

  if (inCode && codeBuffer.length) {
    elements.push(
      <pre key="code-end">
        <code>{codeBuffer.join('\n')}</code>
      </pre>
    )
  }

  if (inCallout && calloutBuffer.length) {
    elements.push(
      <div className="callout" key="callout-end">
        <span className="callout-mark">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </span>
        <div>
          {calloutBuffer.map((c, idx) => (
            <p key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(c) }} />
          ))}
        </div>
      </div>
    )
  }

  return elements
}

function inlineMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

function parseErrorPayload(content) {
  if (typeof content !== 'string') return null

  const trimmed = content.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.__relay_error || parsed.is_error || parsed.error_type) {
        return {
          statusCode: parsed.status_code || 429,
          title: parsed.title || 'Model Quota / Rate Limit Exceeded',
          message: parsed.message || 'Error communicating with live model.',
          retryDelay: parsed.retry_delay || 20,
          rawDetails: parsed.raw_details || trimmed
        }
      }
    } catch {
    }
  }

  if (
    trimmed.startsWith('Error communicating with live model:') ||
    trimmed.includes('RESOURCE_EXHAUSTED') ||
    trimmed.includes('429 RESOURCE_EXHAUSTED')
  ) {
    const is429 = trimmed.includes('RESOURCE_EXHAUSTED') || trimmed.includes('429')
    const retryMatch = trimmed.match(/retry in ([0-9]+(?:\.[0-9]+)?)s/i)
    const retryDelay = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 20

    return {
      statusCode: is429 ? 429 : 500,
      title: is429 ? 'API Rate Limit Exceeded' : 'Engine Notice',
      message: is429
        ? 'Daily request limit reached for the active API key. Please retry after the cooldown timer or configure an alternative key in Settings.'
        : 'An error occurred while generating a response. Please check your API key in Settings.',
      retryDelay,
      rawDetails: trimmed
    }
  }

  return null
}

function ModelErrorCard({ errorData, onRetry, onDelete, onShowToast }) {
  const [countdown, setCountdown] = useState(errorData.retryDelay || 20)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const handleOpenSettings = () => {
    window.dispatchEvent(new CustomEvent('relay:open-engine-settings'))
  }

  return (
    <div className="model-error-card">
      <div className="error-card-header">
        <div className="error-card-title-group">
          <span className="error-badge">{errorData.statusCode === 429 ? 'RATE LIMIT' : 'NOTICE'}</span>
          <strong>{errorData.title}</strong>
        </div>
      </div>

      <p className="error-card-message">{errorData.message}</p>

      <div className="error-card-actions">
        <button
          type="button"
          className="error-action-btn primary"
          onClick={onRetry}
          disabled={countdown > 0}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          {countdown > 0 ? (
            `Retry in ${countdown}s`
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6"/>
                <path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              <span>Retry Prompt</span>
            </>
          )}
        </button>

        <button
          type="button"
          className="error-action-btn"
          onClick={handleOpenSettings}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span>Configure Key</span>
        </button>

        {onDelete && (
          <button
            type="button"
            className="error-action-btn dismiss"
            onClick={onDelete}
          >
            Dismiss
          </button>
        )}
      </div>

      <details className="error-tech-details">
        <summary>View raw response details</summary>
        <pre>{errorData.rawDetails}</pre>
      </details>
    </div>
  )
}

export function MessageItem({ message, onRegenerate, onDeleteMessage, onShowToast }) {
  const isUser = message.role === 'user'
  const [feedback, setFeedback] = useState(null)
  const errorData = !isUser ? parseErrorPayload(message.content) : null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      onShowToast('Response copied to clipboard')
    } catch {
      onShowToast('Ready to copy')
    }
  }

  return (
    <article className={`message ${isUser ? 'user-message' : 'assistant-message'}`}>
      <div className="message-meta">
        {isUser ? (
          <span className="avatar small">JM</span>
        ) : (
          <span className="mini-mark">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M8 7h9c7 0 7 9 0 9h-7l12 11" />
            </svg>
          </span>
        )}
        <strong>{isUser ? 'You' : 'RELAY'}</strong>
        <time>{message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</time>
      </div>

      <div className="message-body" aria-live="polite">
        {errorData ? (
          <ModelErrorCard
            errorData={errorData}
            onRetry={() => onRegenerate && onRegenerate(message)}
            onDelete={() => onDeleteMessage && onDeleteMessage(message.id)}
            onShowToast={onShowToast}
          />
        ) : (
          renderMarkdown(message.content)
        )}
      </div>

      {!isUser && !errorData && (
        <div className="message-actions">
          <button type="button" onClick={handleCopy}>Copy</button>
          {onRegenerate && (
            <button type="button" onClick={() => onRegenerate(message)}>Regenerate</button>
          )}
          <span className="action-spacer"></span>
          <button
            type="button"
            className={feedback === 'pos' ? 'selected' : ''}
            onClick={() => {
              setFeedback(feedback === 'pos' ? null : 'pos')
              onShowToast('Thanks for the signal')
            }}
            aria-label="Good response"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
          </button>
          <button
            type="button"
            className={feedback === 'neg' ? 'selected' : ''}
            onClick={() => {
              setFeedback(feedback === 'neg' ? null : 'neg')
              onShowToast('Feedback noted')
            }}
            aria-label="Bad response"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>
            </svg>
          </button>
        </div>
      )}
    </article>
  )
}

