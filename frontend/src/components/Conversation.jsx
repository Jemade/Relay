import React, { useRef, useEffect } from 'react'
import { MessageItem } from './MessageItem'
import { Composer } from './Composer'

export function Conversation({
  thread,
  messages,
  onSendMessage,
  onRegenerate,
  onDeleteMessage,
  onGradeThread,
  activeGradingTask,
  isGenerating,
  onStopGeneration,
  onShareThread,
  onShowToast
}) {
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isGenerating, activeGradingTask])

  const nodes = [
    { key: 'intake', label: 'Intake' },
    { key: 'clarity_evaluator', label: 'Clarity' },
    { key: 'actionability_evaluator', label: 'Actionability' },
    { key: 'grounding_evaluator', label: 'Grounding' },
    { key: 'scorecard_synthesizer', label: 'Synthesizer' }
  ]

  const currentNodeKey = activeGradingTask?.current_node || ''
  const isCompleted = activeGradingTask?.status === 'completed'

  return (
    <section className="conversation" aria-label="Thread conversation">
      <div className="conversation-header">
        <div>
          <p className="eyebrow">Thread · Updated just now</p>
          <h1>{thread?.title || 'Product direction'}</h1>
        </div>

        <div className="header-actions">
          <button
            className={`grade-button ${activeGradingTask ? 'running' : ''}`}
            onClick={onGradeThread}
            disabled={Boolean(activeGradingTask && activeGradingTask.status === 'processing')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span>{activeGradingTask && activeGradingTask.status === 'processing' ? 'Grading...' : 'Grade Thread'}</span>
          </button>
          <button className="share-button" onClick={onShareThread} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            <span>Share</span>
          </button>
        </div>
      </div>

      {activeGradingTask && (
        <div className="grading-banner">
          <div className="grading-status-text">
            <span className="signal signal-one"></span>
            <strong>LangGraph Multi-Agent Pipeline:</strong>
            <span>
              {isCompleted ? 'Scorecard ready! View in Scorecards tab.' : `Processing node: ${currentNodeKey || 'initializing'}`}
            </span>
          </div>
          <div className="grading-steps">
            {nodes.map((node, index) => {
              const nodeIndex = nodes.findIndex((n) => n.key === currentNodeKey)
              const isPast = isCompleted || (nodeIndex !== -1 && index < nodeIndex)
              const isActive = !isCompleted && node.key === currentNodeKey
              return (
                <span
                  key={node.key}
                  className={`grading-step-pill ${isActive ? 'active' : ''} ${isPast ? 'done' : ''}`}
                >
                  {node.label}
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className="messages" id="messages">
        {messages.length === 0 && !isGenerating && (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '420px', padding: '36px 20px' }}>
            <span className="mini-mark" style={{ width: '40px', height: '40px', margin: '0 auto 14px' }}>
              <svg viewBox="0 0 32 32" style={{ width: '22px', height: '22px' }} aria-hidden="true">
                <path d="M8 7h9c7 0 7 9 0 9h-7l12 11" />
              </svg>
            </span>
            <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700' }}>Relay a thought</h2>
            <p style={{ margin: '0', color: 'var(--muted)', fontSize: '13px', lineHeight: '1.6' }}>
              This thread has no messages yet. Type a question or select a prompt below to begin.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <MessageItem
            key={m.id || m.content}
            message={m}
            onRegenerate={onRegenerate}
            onDeleteMessage={onDeleteMessage}
            onShowToast={onShowToast}
          />
        ))}

        {isGenerating && (
          <article className="message assistant-message">
            <div className="message-meta">
              <span className="mini-mark">
                <svg viewBox="0 0 32 32" aria-hidden="true">
                  <path d="M8 7h9c7 0 7 9 0 9h-7l12 11" />
                </svg>
              </span>
              <strong>RELAY</strong>
              <time>Relaying now</time>
            </div>
            <div className="message-body" aria-live="polite">
              <div className="stream-tokens">
                <span className="signal signal-one"></span>
                <span className="signal signal-two"></span>
                <span className="signal signal-three"></span>
                <span>Thinking through that...</span>
              </div>
            </div>
          </article>
        )}

        <div ref={messagesEndRef} />
      </div>

      <Composer
        onSendMessage={onSendMessage}
        onStopGeneration={onStopGeneration}
        isGenerating={isGenerating}
        onShowToast={onShowToast}
      />
    </section>
  )
}
