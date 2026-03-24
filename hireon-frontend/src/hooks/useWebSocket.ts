import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useActivityStore } from '@/store/activityStore'

const getWsBase = () => {
  const { protocol, host } = window.location
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:'
  const baseUrl = import.meta.env.VITE_API_BASE_URL || `${wsProtocol}//${host}`
  return baseUrl.startsWith('http') ? baseUrl.replace('http', 'ws') : baseUrl
}

const WS_BASE = getWsBase()

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>()
  const { accessToken, isAuthenticated } = useAuthStore()
  const { addNotification, setUnreadCount } = useNotificationStore()
  const { addActivity } = useActivityStore()

  const connect = useCallback(() => {
    if (!accessToken || !isAuthenticated) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_BASE}/v1/notifications/ws?token=${accessToken}`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WS] Connected')
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'event') {
          if (msg.event === 'notification' && msg.data) {
            addNotification(msg.data)
          }
          if (msg.event === 'unread_count') {
            setUnreadCount(msg.data.count)
          }
          if (msg.event === 'activity_created') {
            addActivity(msg.data)
          }
        }
      } catch (_) { /* ignore */ }
    }

    ws.onclose = (e) => {
      console.log('[WS] Disconnected, reconnecting in 3s...')
      reconnectTimeout.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }

    // Keep-alive ping every 30s
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping')
    }, 30000)

    ws.addEventListener('close', () => clearInterval(pingInterval))
  }, [accessToken, isAuthenticated, addNotification, setUnreadCount])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimeout.current)
      wsRef.current?.close()
    }
  }, [connect])
}
