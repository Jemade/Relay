import React, { useState, useEffect } from 'react'
import { StartupLoader } from './components/StartupLoader'
import { LandingPage } from './components/LandingPage'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { Conversation } from './components/Conversation'
import { WorkspaceView } from './components/WorkspaceView'
import { ScorecardView } from './components/ScorecardView'
import { Toast } from './components/Toast'

import * as api from './services/api'
import { subscribeToGradingEvents } from './services/sse'

export function App() {
  const [loaderFinished, setLoaderFinished] = useState(false)
  const [showLanding, setShowLanding] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const [activeTab, setActiveTab] = useState('threads')
  const [threads, setThreads] = useState([])
  const [activeThreadId, setActiveThreadId] = useState(null)
  const [activeThread, setActiveThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)

  const [signals, setSignals] = useState([])
  const [library, setLibrary] = useState([])

  const [userName, setUserName] = useState(() => localStorage.getItem('relay_username') || 'Operator')

  const [metrics, setMetrics] = useState({
    threads_count: 0,
    messages_count: 0,
    total_tokens: 0,
    scorecards_count: 0,
    capacity_limit: 100000,
    capacity_used_pct: 0
  })

  const [activeGradingTask, setActiveGradingTask] = useState(null)
  const [scorecards, setScorecards] = useState([])
  const [selectedScorecard, setSelectedScorecard] = useState(null)
  const [health, setHealth] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? '' : cur))
    }, 2400)
  }

  const handleUpdateUserName = (newName) => {
    setUserName(newName)
    localStorage.setItem('relay_username', newName)
  }

  // Load initial workspace state on mount
  useEffect(() => {
    loadThreads()
    loadMetrics()
    loadHealth()
    loadScorecards()

    // Global shortcut listener
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        handleNewThread()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadMetrics = async () => {
    try {
      const data = await api.getMetrics()
      setMetrics(data)
    } catch (err) {
      console.warn('Failed to load metrics:', err)
    }
  }

  const loadHealth = async () => {
    try {
      const data = await api.getHealth()
      setHealth(data)
    } catch (err) {
      console.warn('Health check failed:', err)
    }
  }

  const loadScorecards = async () => {
    try {
      const list = await api.fetchScorecards()
      setScorecards(list || [])
    } catch (err) {
      console.warn('Failed to load scorecards:', err)
    }
  }

  const loadThreads = async () => {
    try {
      const list = await api.fetchThreads()
      setThreads(list || [])
      if (list && list.length > 0) {
        selectThread(list[0].id)
      } else {
        setActiveThreadId(null)
        setActiveThread(null)
        setMessages([])
      }
    } catch (err) {
      console.error('Failed to load threads:', err)
    }
  }

  const selectThread = async (id) => {
    setActiveThreadId(id)
    try {
      const t = await api.getThread(id)
      setActiveThread(t)
      setMessages(t.messages || [])
    } catch (err) {
      console.error('Failed to fetch thread:', err)
    }
  }

  const handleNewThread = async () => {
    try {
      const created = await api.createThread('New thread')
      setThreads((prev) => [created, ...prev])
      selectThread(created.id)
      setActiveTab('threads')
      showToast('New thread ready')
      loadMetrics()
    } catch (err) {
      showToast('Failed to create thread')
    }
  }

  const handleSendMessage = async (content) => {
    if (!activeThreadId) {
      try {
        const created = await api.createThread('New thread')
        setThreads((prev) => [created, ...prev])
        setActiveThreadId(created.id)
        setActiveThread(created)
        await performSendMessage(created.id, content)
      } catch {
        showToast('Failed to start thread')
      }
      return
    }
    await performSendMessage(activeThreadId, content)
  }

  const performSendMessage = async (threadId, content) => {
    setIsGenerating(true)
    try {
      const updatedMessages = await api.sendMessage(threadId, content)
      setMessages((prev) => [...prev, ...updatedMessages])
      loadThreads()
      loadMetrics()
    } catch (err) {
      showToast('Failed to relay message')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = async () => {
    if (!activeThreadId) return
    setIsGenerating(true)
    try {
      showToast('Retrying live model...')
      const refreshedMsgs = await api.regenerateMessage(activeThreadId)
      setMessages(refreshedMsgs)
      loadMetrics()
    } catch (err) {
      showToast('Failed to retry: ' + err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteMessage = async (msgId) => {
    if (!activeThreadId) return
    try {
      await api.deleteMessage(activeThreadId, msgId)
      setMessages((prev) => prev.filter((m) => m.id !== msgId))
      showToast('Message removed')
    } catch {
      showToast('Failed to remove message')
    }
  }


  const handleGradeThread = async () => {
    if (!activeThreadId) {
      showToast('Create or select a thread with messages to grade')
      return
    }

    if (messages.length === 0) {
      showToast('Thread has no messages yet to evaluate')
      return
    }

    showToast('Triggering LangGraph multi-agent grading pipeline...')
    try {
      const response = await api.evaluateTranscript({ threadId: activeThreadId })
      const taskId = response.task_id
      setActiveGradingTask({
        task_id: taskId,
        status: 'processing',
        current_node: 'intake'
      })

      subscribeToGradingEvents(taskId, {
        onNodeStart: (data) => {
          setActiveGradingTask((prev) => ({
            ...prev,
            current_node: data.node,
            status: 'processing'
          }))
        },
        onNodeComplete: (data) => {
          setActiveGradingTask((prev) => ({
            ...prev,
            current_node: data.node,
            status: 'processing'
          }))
        },
        onCompleted: (data) => {
          setActiveGradingTask((prev) => ({
            ...prev,
            status: 'completed',
            scorecard: data.scorecard
          }))
          showToast(`Grading complete! Grade: ${data.scorecard?.grade_letter} (${data.scorecard?.overall_score}/100)`)
          loadScorecards()
          loadMetrics()
        },
        onFailed: (data) => {
          setActiveGradingTask(null)
          showToast(`Grading failed: ${data.error}`)
        }
      })
    } catch (err) {
      showToast('Failed to enqueue grading task')
    }
  }

  const handleRenameThread = async () => {
    if (!activeThread) return
    const newName = window.prompt('Name this thread', activeThread.title)
    if (newName && newName.trim()) {
      try {
        const updated = await api.updateThread(activeThread.id, { title: newName.trim() })
        setActiveThread(updated)
        setThreads((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        showToast('Thread renamed')
      } catch {
        showToast('Failed to rename')
      }
    }
  }

  const handleDuplicateThread = async () => {
    if (!activeThread) return
    try {
      const created = await api.createThread(`${activeThread.title} copy`)
      for (const m of messages) {
        await api.sendMessage(created.id, m.content, m.role)
      }
      setThreads((prev) => [created, ...prev])
      selectThread(created.id)
      showToast('Thread duplicated')
      loadMetrics()
    } catch {
      showToast('Failed to duplicate thread')
    }
  }

  const handleArchiveThread = () => {
    setActiveTab('signals')
    showToast('Thread archived to workspace')
  }

  const handleShareThread = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      showToast('Thread link copied')
    } catch {
      showToast('Thread link ready to share')
    }
  }

  const handleUpdateApiKey = async (payload) => {
    if (typeof payload === 'string') {
      await api.updateApiKeys({ api_key: payload })
    } else {
      await api.updateApiKeys(payload)
    }
    await loadHealth()
  }


  return (
    <>
      <StartupLoader onDone={() => setLoaderFinished(true)} />

      {showLanding && (
        <LandingPage onEnter={() => setShowLanding(false)} />
      )}

      <div className="app-shell" aria-hidden={showLanding || !loaderFinished}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={(id) => {
            selectThread(id)
            setSelectedScorecard(null)
          }}
          onNewThread={handleNewThread}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab)
            if (tab !== 'scorecards') setSelectedScorecard(null)
          }}
          metrics={metrics}
          userName={userName}
          onUpdateUserName={handleUpdateUserName}
          onShowToast={showToast}
        />

        <main className="main-content">
          <Topbar
            onOpenSidebar={() => setSidebarOpen(true)}
            activeTab={activeTab}
            activeThread={activeThread}
            onRenameThread={handleRenameThread}
            onDuplicateThread={handleDuplicateThread}
            onArchiveThread={handleArchiveThread}
            onGradeThread={handleGradeThread}
            health={health}
            onUpdateApiKey={handleUpdateApiKey}
            onShowToast={showToast}
          />

          {activeTab === 'threads' && (
            activeThread ? (
              <Conversation
                thread={activeThread}
                messages={messages}
                onSendMessage={handleSendMessage}
                onRegenerate={handleRegenerate}
                onDeleteMessage={handleDeleteMessage}
                onGradeThread={handleGradeThread}
                activeGradingTask={activeGradingTask}
                isGenerating={isGenerating}
                onStopGeneration={() => setIsGenerating(false)}
                onShareThread={handleShareThread}
                onShowToast={showToast}
              />
            ) : (
              <section className="conversation" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ maxWidth: '440px', padding: '40px 20px' }}>
                  <span className="mini-mark" style={{ width: '48px', height: '48px', margin: '0 auto 16px' }}>
                    <svg viewBox="0 0 32 32" style={{ width: '24px', height: '24px' }} aria-hidden="true">
                      <path d="M8 7h9c7 0 7 9 0 9h-7l12 11" />
                    </svg>
                  </span>
                  <h2 style={{ fontSize: '22px', margin: '0 0 8px', fontWeight: '800' }}>No conversations yet</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: '1.6', margin: '0 0 20px' }}>
                    Start your first conversation to begin turning unfinished thoughts into useful next steps.
                  </p>
                  <button className="landing-cta" onClick={handleNewThread} style={{ margin: '0 auto' }}>
                    Create first thread <span>+</span>
                  </button>
                </div>
              </section>
            )
          )}

          {activeTab === 'signals' && (
            <WorkspaceView
              type="signals"
              cards={signals}
              onClose={() => setActiveTab('threads')}
            />
          )}

          {activeTab === 'library' && (
            <WorkspaceView
              type="library"
              cards={library}
              onClose={() => setActiveTab('threads')}
            />
          )}

          {activeTab === 'scorecards' && (
            selectedScorecard ? (
              <ScorecardView
                scorecard={selectedScorecard}
                onClose={() => setSelectedScorecard(null)}
              />
            ) : (
              <WorkspaceView
                type="scorecards"
                scorecards={scorecards}
                onSelectScorecard={(sc) => setSelectedScorecard(sc)}
                onClose={() => setActiveTab('threads')}
              />
            )
          )}
        </main>

        <div
          className={`mobile-scrim ${sidebarOpen ? 'visible' : ''}`}
          id="scrim"
          onClick={() => setSidebarOpen(false)}
        />
      </div>

      <Toast message={toastMessage} />
    </>
  )
}
export default App
