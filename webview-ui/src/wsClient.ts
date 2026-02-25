type MessageHandler = (event: { data: any }) => void

class WsClient {
  private ws: WebSocket | null = null
  private handlers: Set<MessageHandler> = new Set()
  private isConnecting = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private queuedMessages: any[] = []

  connect() {
    if (this.ws || this.isConnecting) return
    this.isConnecting = true

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname || 'localhost'
    const port = '3333'
    const url = `${protocol}//${host}:${port}`

    console.log(`🔌 Connecting to ${url}...`)
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected')
      this.isConnecting = false
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
      
      // Send queued messages
      while (this.queuedMessages.length > 0) {
        const msg = this.queuedMessages.shift()
        this.send(msg)
      }
      
      // Notify server we're ready (mimics vscode.postMessage({ type: 'webviewReady' }))
      this.send({ type: 'webviewReady' })
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handlers.forEach(handler => handler({ data }))
      } catch (err) {
        console.error('❌ Failed to parse WebSocket message:', err)
      }
    }

    this.ws.onclose = () => {
      console.log('❌ WebSocket disconnected')
      this.ws = null
      this.isConnecting = false
      this.scheduleReconnect()
    }

    this.ws.onerror = (err) => {
      console.error('❌ WebSocket error:', err)
      // onclose will fire and handle reconnect
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    console.log('⏱️ Scheduling reconnect in 2s...')
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 2000)
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  addMessageHandler(handler: MessageHandler) {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }

  send(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    } else {
      console.log('⚠️ WebSocket not ready, queueing message:', msg.type)
      this.queuedMessages.push(msg)
      if (!this.ws && !this.isConnecting) {
        this.connect()
      }
    }
  }
}

export const wsClient = new WsClient()
