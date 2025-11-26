'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { useSocket } from '@/hooks/useSocket';

interface Notification {
  notification_id: number;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const socket = useSocket();

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Listen for real-time notifications
    if (socket) {
      socket.on('notification', (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });
    }

    // Poll for new notifications every 30 seconds as fallback
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 30000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('notification');
      }
    };
  }, [socket]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/api/notifications/unread-count');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read if not already read
      if (!notification.is_read) {
        await api.put(`/api/notifications/${notification.notification_id}/read`);
        fetchNotifications();
        fetchUnreadCount();
      }
      
      // Navigate to link if it exists
      if (notification.link) {
        setShowDropdown(false);
        router.push(notification.link);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-slate-500 hover:text-slate-700"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50 border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-medium text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-teal-600 hover:text-teal-700"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-slate-500 text-center">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.notification_id}
                  className={`p-4 border-b border-slate-100 transition-colors ${
                    notification.link 
                      ? 'cursor-pointer hover:bg-slate-50' 
                      : 'cursor-default'
                  } ${
                    !notification.is_read ? 'bg-teal-50/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start">
                    {!notification.is_read && (
                      <span className="mt-1 mr-2 block h-2 w-2 rounded-full bg-teal-500 flex-shrink-0"></span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <p className={`text-sm ${notification.link ? 'text-slate-800 font-medium' : 'text-slate-700'}`}>
                          {notification.message}
                        </p>
                        {notification.link && (
                          <svg
                            className="h-4 w-4 text-teal-600 ml-2 flex-shrink-0 mt-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

