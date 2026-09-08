const API_BASE = '/api'

export async function fetchThreads() {
  const res = await fetch(`${API_BASE}/threads`)
  if (!res.ok) throw new Error('Failed to fetch threads')
  return res.json()
}

export async function createThread(title = 'New thread') {
  const res = await fetch(`${API_BASE}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, meta_info: {} })
  })
  if (!res.ok) throw new Error('Failed to create thread')
  return res.json()
}

export async function getThread(threadId) {
  const res = await fetch(`${API_BASE}/threads/${threadId}`)
  if (!res.ok) throw new Error('Failed to fetch thread')
  return res.json()
}

export async function updateThread(threadId, data) {
  const res = await fetch(`${API_BASE}/threads/${threadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update thread')
  return res.json()
}

export async function deleteThread(threadId) {
  const res = await fetch(`${API_BASE}/threads/${threadId}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete thread')
}

export async function sendMessage(threadId, content, role = 'user') {
  const res = await fetch(`${API_BASE}/threads/${threadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content })
  })
  if (!res.ok) throw new Error('Failed to send message')
  return res.json()
}

export async function regenerateMessage(threadId) {
  const res = await fetch(`${API_BASE}/threads/${threadId}/regenerate`, {
    method: 'POST'
  })
  if (!res.ok) throw new Error('Failed to regenerate response')
  return res.json()
}

export async function deleteMessage(threadId, messageId) {
  const res = await fetch(`${API_BASE}/threads/${threadId}/messages/${messageId}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete message')
}


export async function evaluateTranscript({ threadId, transcriptText }) {
  const res = await fetch(`${API_BASE}/grading/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_id: threadId, transcript_text: transcriptText })
  })
  if (!res.ok) throw new Error('Failed to start evaluation')
  return res.json()
}

export async function getGradingStatus(taskId) {
  const res = await fetch(`${API_BASE}/grading/tasks/${taskId}`)
  if (!res.ok) throw new Error('Failed to fetch grading task status')
  return res.json()
}

export async function fetchScorecards() {
  const res = await fetch(`${API_BASE}/grading/scorecards`)
  if (!res.ok) throw new Error('Failed to fetch scorecards')
  return res.json()
}

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`)
  if (!res.ok) throw new Error('Failed to fetch health info')
  return res.json()
}

export async function getMetrics() {
  const res = await fetch(`${API_BASE}/metrics`)
  if (!res.ok) throw new Error('Failed to fetch real metrics')
  return res.json()
}

export async function updateApiKeys(keys) {
  const res = await fetch(`${API_BASE}/settings/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(keys)
  })
  if (!res.ok) throw new Error('Failed to update API keys')
  return res.json()
}
