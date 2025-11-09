'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, X, CheckCircle2, AlertCircle, Trash2, Info } from 'lucide-react'
import { apiGet } from '@/lib/api-client'

interface Notification {
  id: string
  sourceTable: string
  sourceKey: string
  actionType: 'INSERT' | 'UPDATE' | 'DELETE'
  changedAt: string
  changedBy: string | null
  brandId: string | null
  categoryId: string | null
  subcategoryId: string | null
  knowledgeId: string | null
  sopId: string | null
  qualityTrainingId: string | null
  changes: Array<{
    fieldName: string
    oldValue: string | null
    newValue: string | null
  }>
}

interface NotificationBellProps {
  unreadCount?: number
}

const STORAGE_KEY = 'notification_read_ids'
const LAST_VIEWED_KEY = 'notification_last_viewed'
const MAX_STORAGE_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

// Get read notification IDs from localStorage
function getReadNotificationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return new Set()
    
    const data = JSON.parse(stored)
    const now = Date.now()
    
    // Filter out old entries (older than 7 days)
    const validEntries = data.filter((entry: { id: string; timestamp: number }) => {
      return now - entry.timestamp < MAX_STORAGE_AGE
    })
    
    // Update localStorage with cleaned data
    if (validEntries.length !== data.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validEntries))
    }
    
    return new Set(validEntries.map((entry: { id: string }) => entry.id))
  } catch {
    return new Set()
  }
}

// Get last viewed timestamp
function getLastViewedTimestamp(): number {
  if (typeof window === 'undefined') return 0
  
  try {
    const stored = localStorage.getItem(LAST_VIEWED_KEY)
    if (!stored) return 0
    return parseInt(stored, 10)
  } catch {
    return 0
  }
}

// Update last viewed timestamp
function updateLastViewedTimestamp() {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(LAST_VIEWED_KEY, Date.now().toString())
  } catch (error) {
    console.error('Error updating last viewed timestamp:', error)
  }
}

// Save read notification ID to localStorage
function markNotificationAsRead(notificationId: string) {
  if (typeof window === 'undefined') return
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const data: Array<{ id: string; timestamp: number }> = stored ? JSON.parse(stored) : []
    
    // Check if already exists
    if (data.some(entry => entry.id === notificationId)) {
      return
    }
    
    // Add new entry
    data.push({
      id: notificationId,
      timestamp: Date.now(),
    })
    
    // Keep only last 1000 entries to avoid localStorage overflow
    const cleanedData = data.slice(-1000)
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedData))
  } catch (error) {
    console.error('Error saving read notification:', error)
  }
}

// Mark multiple notifications as read
function markNotificationsAsRead(notificationIds: string[]) {
  notificationIds.forEach(id => markNotificationAsRead(id))
}

export function NotificationBell({}: NotificationBellProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set())
  const [lastViewedTimestamp, setLastViewedTimestamp] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notificationRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Load read notification IDs and last viewed timestamp from localStorage on mount
  useEffect(() => {
    setReadNotificationIds(getReadNotificationIds())
    setLastViewedTimestamp(getLastViewedTimestamp())
  }, [])

  // Calculate actual unread count
  // Count notifications that are newer than lastViewedTimestamp or haven't been read
  const unreadCount = notifications.filter(n => {
    const notificationTime = new Date(n.changedAt).getTime()
    const isNewerThanLastViewed = notificationTime > lastViewedTimestamp
    const isNotRead = !readNotificationIds.has(n.id)
    return isNewerThanLastViewed || isNotRead
  }).length

  // Fetch notifications with proper error handling
  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const result = await apiGet<{ notifications: Notification[] }>('/api/notifications?limit=20', {
        timeout: 5000, // 5 second timeout
        retries: 1, // Retry once on failure
      })

      if (result.ok && result.data) {
        setNotifications(result.data.notifications || [])
      } else {
        // Silently handle error - don't show notifications if fetch fails
        // Error is already handled by apiGet, no need to log or throw
        setNotifications([])
      }
    } catch (error) {
      // Fallback error handling (should not happen with safeFetch, but just in case)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    if (readNotificationIds.has(notificationId)) return
    
    markNotificationAsRead(notificationId)
    setReadNotificationIds(prev => {
      const next = new Set(prev)
      next.add(notificationId)
      return next
    })
  }, [readNotificationIds])

  // Setup Intersection Observer to mark notifications as read when scrolled into view
  useEffect(() => {
    if (!isOpen || notifications.length === 0) {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      return
    }

    // Create Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const notificationId = entry.target.getAttribute('data-notification-id')
            if (notificationId) {
              markAsRead(notificationId)
            }
          }
        })
      },
      {
        root: dropdownRef.current?.querySelector('.overflow-y-auto'),
        rootMargin: '0px',
        threshold: 0.3, // Mark as read when 30% visible
      }
    )

    observerRef.current = observer

    // Observe all notification elements after a short delay to ensure DOM is ready
    const timer = setTimeout(() => {
      notificationRefs.current.forEach((element) => {
        if (element && observer) {
          observer.observe(element)
        }
      })
    }, 100)

    return () => {
      clearTimeout(timer)
      if (observer) {
        observer.disconnect()
      }
    }
  }, [isOpen, notifications, markAsRead])

  // Update last viewed timestamp and mark notifications as read when dropdown is opened
  useEffect(() => {
    if (isOpen && notifications.length > 0) {
      // Update last viewed timestamp immediately when dropdown opens
      const currentTime = Date.now()
      updateLastViewedTimestamp()
      setLastViewedTimestamp(currentTime)
      
      // Mark all notifications as read after user has viewed them for 2 seconds
      const timer = setTimeout(() => {
        const idsToMark = notifications
          .map(n => n.id)
          .filter(id => !readNotificationIds.has(id))
        
        if (idsToMark.length > 0) {
          markNotificationsAsRead(idsToMark)
          setReadNotificationIds(prev => {
            const next = new Set(prev)
            idsToMark.forEach(id => next.add(id))
            return next
          })
        }
      }, 2000) // Mark as read after 2 seconds of viewing dropdown

      return () => clearTimeout(timer)
    }
  }, [isOpen, notifications, readNotificationIds])

  // Fetch notifications on mount and when dropdown opens
  useEffect(() => {
    fetchNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      if (!isOpen) {
        fetchNotifications()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Refresh when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'INSERT':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'UPDATE':
        return <Info className="h-4 w-4 text-blue-600" />
      case 'DELETE':
        return <Trash2 className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'INSERT':
        return 'bg-green-100 text-green-800'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'INSERT':
        return 'Ditambahkan'
      case 'UPDATE':
        return 'Diubah'
      case 'DELETE':
        return 'Dihapus'
      default:
        return actionType
    }
  }

  const getTableLabel = (tableName: string) => {
    const tableLabels: Record<string, string> = {
      'produks': 'Produk',
      'brands': 'Brand',
      'kategori_produks': 'Kategori Produk',
      'subkategori_produks': 'Subkategori Produk',
      'users': 'User',
      'agents': 'Agent',
      'sops': 'SOP',
      'knowledges': 'Knowledge',
      'quality_trainings': 'Quality Training',
    }
    return tableLabels[tableName] || tableName
  }

  const formatNotificationMessage = (notification: Notification) => {
    const tableLabel = getTableLabel(notification.sourceTable)
    const actionLabel = getActionLabel(notification.actionType)
    const changeCount = notification.changes.length
    
    if (changeCount === 1) {
      const change = notification.changes[0]
      return `${tableLabel} "${change.fieldName}" ${actionLabel.toLowerCase()}`
    }
    
    return `${tableLabel} - ${changeCount} perubahan ${actionLabel.toLowerCase()}`
  }

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
      
      if (diffInSeconds < 60) {
        return 'Baru saja'
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60)
        return `${minutes} menit yang lalu`
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600)
        return `${hours} jam yang lalu`
      } else {
        const days = Math.floor(diffInSeconds / 86400)
        return `${days} hari yang lalu`
      }
    } catch {
      return 'Baru saja'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] max-h-[600px] flex flex-col" style={{ top: '100%' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notifikasi</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#03438f]/30 border-t-[#03438f] rounded-full animate-spin"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">Tidak ada notifikasi</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => {
                  const isRead = readNotificationIds.has(notification.id)
                  return (
                    <div
                      key={notification.id}
                      ref={(el) => {
                        if (el) {
                          notificationRefs.current.set(notification.id, el)
                        } else {
                          notificationRefs.current.delete(notification.id)
                        }
                      }}
                      data-notification-id={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${
                        isRead 
                          ? 'border-transparent opacity-75' 
                          : 'border-[#03438f] bg-blue-50/30'
                      } hover:border-[#03438f]`}
                      onClick={() => {
                        // Mark as read when clicked
                        markAsRead(notification.id)
                        setIsOpen(false)
                        
                        // Navigate based on source table and related IDs
                        // If brandId exists, navigate to brand tracking page
                        if (notification.brandId) {
                          router.push(`/admin/products/brand/${notification.brandId}/tracking`)
                        } else if (notification.sourceTable === 'produks') {
                          router.push(`/admin/products/tracker`)
                        } else if (notification.sourceTable === 'users') {
                          router.push(`/admin/users`)
                        } else if (notification.sourceTable === 'brands') {
                          router.push(`/admin/products?tab=brand`)
                        } else if (notification.sourceTable === 'sops' || notification.sopId) {
                          router.push(`/admin/sop`)
                        } else if (notification.sourceTable === 'knowledges' || notification.knowledgeId) {
                          router.push(`/admin/knowledge`)
                        } else if (notification.sourceTable === 'quality_trainings' || notification.qualityTrainingId) {
                          router.push(`/admin/quality-training`)
                        } else {
                          // Default to dashboard
                          router.push(`/admin/dashboard`)
                        }
                      }}
                    >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getActionIcon(notification.actionType)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColor(notification.actionType)}`}>
                            {notification.actionType}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.changedAt)}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {formatNotificationMessage(notification)}
                        </p>

                        <div className="text-xs text-gray-600 space-y-1">
                          <p>
                            <span className="font-medium">Tabel:</span> {getTableLabel(notification.sourceTable)}
                          </p>
                          {notification.brandId && (
                            <p>
                              <span className="font-medium">Brand:</span>{' '}
                              <span className="text-[#03438f] font-semibold">ID: {notification.brandId.substring(0, 12)}...</span>
                            </p>
                          )}
                          {notification.categoryId && (
                            <p>
                              <span className="font-medium">Kategori:</span> ID: {notification.categoryId.substring(0, 12)}...
                            </p>
                          )}
                          {notification.subcategoryId && (
                            <p>
                              <span className="font-medium">Subkategori:</span> ID: {notification.subcategoryId.substring(0, 12)}...
                            </p>
                          )}
                          {notification.knowledgeId && (
                            <p>
                              <span className="font-medium">Knowledge:</span> ID: {notification.knowledgeId.substring(0, 12)}...
                            </p>
                          )}
                          {notification.sopId && (
                            <p>
                              <span className="font-medium">SOP:</span> ID: {notification.sopId.substring(0, 12)}...
                            </p>
                          )}
                          {notification.qualityTrainingId && (
                            <p>
                              <span className="font-medium">Quality Training:</span> ID: {notification.qualityTrainingId.substring(0, 12)}...
                            </p>
                          )}
                          <p>
                            <span className="font-medium">Record ID:</span> {notification.sourceKey.substring(0, 20)}...
                          </p>
                          {notification.changedBy && (
                            <p>
                              <span className="font-medium">Oleh:</span> {notification.changedBy}
                            </p>
                          )}
                        </div>

                        {/* Changes Preview */}
                        {notification.changes.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-700 mb-1">Perubahan:</p>
                            <div className="space-y-1">
                              {notification.changes.slice(0, 3).map((change, idx) => (
                                <div key={idx} className="text-xs text-gray-600">
                                  <span className="font-medium">{change.fieldName}:</span>
                                  {notification.actionType === 'UPDATE' && (
                                    <>
                                      {' '}
                                      <span className="text-red-600 line-through">{change.oldValue?.substring(0, 20)}</span>
                                      {' → '}
                                      <span className="text-green-600">{change.newValue?.substring(0, 20)}</span>
                                    </>
                                  )}
                                  {notification.actionType === 'INSERT' && (
                                    <span className="text-green-600"> {change.newValue?.substring(0, 30)}</span>
                                  )}
                                  {notification.actionType === 'DELETE' && (
                                    <span className="text-red-600"> {change.oldValue?.substring(0, 30)}</span>
                                  )}
                                </div>
                              ))}
                              {notification.changes.length > 3 && (
                                <p className="text-xs text-gray-500 italic">
                                  +{notification.changes.length - 3} perubahan lainnya
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  router.push('/admin/products/tracker')
                  setIsOpen(false)
                }}
                className="w-full text-center text-sm text-[#03438f] hover:text-[#012f65] font-medium"
              >
                Lihat Semua Notifikasi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

