import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'
import { useNotificationStore } from '@/store/notificationStore'
import { useEffect } from 'react'

export function useNotifications() {
  const { setNotifications, setUnreadCount, markRead, markAllRead } = useNotificationStore()
  const queryClient = useQueryClient()

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await notificationsApi.list()
      setNotifications(data)
      return data
    },
    refetchInterval: 60_000, // poll every minute as fallback
  })

  const { data: countData } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: async () => {
      const { data } = await notificationsApi.unreadCount()
      setUnreadCount(data.count)
      return data
    },
    refetchInterval: 30_000,
  })

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: (_, id) => {
      markRead(id)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      markAllRead()
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  return {
    notifications,
    unreadCount: countData?.count ?? 0,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
  }
}
