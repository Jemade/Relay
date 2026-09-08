export function subscribeToGradingEvents(taskId, { onNodeStart, onNodeComplete, onCompleted, onFailed }) {
  const eventSource = new EventSource(`/api/grading/tasks/${taskId}/events`)

  eventSource.onmessage = (e) => {
    try {
      const payload = JSON.parse(e.data)
      const event = payload.event
      const data = payload.data

      if (event === 'node_start' && onNodeStart) {
        onNodeStart(data)
      } else if (event === 'node_complete' && onNodeComplete) {
        onNodeComplete(data)
      } else if (event === 'pipeline_completed' && onCompleted) {
        onCompleted(data)
        eventSource.close()
      } else if (event === 'pipeline_failed' && onFailed) {
        onFailed(data)
        eventSource.close()
      }
    } catch (err) {
      console.error('Error parsing SSE event:', err)
    }
  }

  eventSource.onerror = (err) => {
    console.warn('SSE connection error or closed:', err)
    eventSource.close()
  }

  return () => {
    eventSource.close()
  }
}
