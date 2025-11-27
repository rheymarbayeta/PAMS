'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';

interface Message {
  message_id: number;
  sender_id: number;
  recipient_id: number;
  content: string;
  sender_name: string;
  recipient_name: string;
  timestamp: string;
}

export default function ChatNotification() {
  const router = useRouter();
  const { user } = useAuth();
  const socket = useSocket();
  const [notification, setNotification] = useState<{ show: boolean; message: Message | null }>({
    show: false,
    message: null,
  });
  const audioContextRef = useRef<AudioContext | null>(null);

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const playNotificationSound = () => {
    try {
      // Create audio context on demand (browsers require user interaction first)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Pleasant notification tone (two-note chime)
      oscillator.frequency.setValueAtTime(830, audioContext.currentTime); // First note
      oscillator.frequency.setValueAtTime(1046, audioContext.currentTime + 0.1); // Second note (higher)
      
      oscillator.type = 'sine';
      
      // Fade in and out for a pleasant sound
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.15);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log('Audio play failed:', e);
    }
  };

  const showNotificationPopup = (message: Message) => {
    // Play sound
    playNotificationSound();
    
    // Show in-app popup
    setNotification({ show: true, message });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification({ show: false, message: null });
    }, 5000);
    
    // Show browser notification if permitted and page is not focused
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      const browserNotification = new Notification(`New message from ${message.sender_name}`, {
        body: message.content.substring(0, 100),
        icon: '/dalaguete-logo.png',
      });
      
      // Click on browser notification opens chat
      browserNotification.onclick = () => {
        window.focus();
        router.push(`/chat?user_id=${message.sender_id}`);
        browserNotification.close();
      };
    }
  };

  // Listen for new messages globally
  useEffect(() => {
    if (socket && user) {
      const handleNewMessage = (message: Message) => {
        // Only show notification for incoming messages (not ones we sent)
        if (message.recipient_id === user.user_id) {
          showNotificationPopup(message);
        }
      };

      socket.on('new_message', handleNewMessage);

      return () => {
        socket.off('new_message', handleNewMessage);
      };
    }
  }, [socket, user]);

  const handleNotificationClick = () => {
    if (notification.message) {
      router.push(`/chat?user_id=${notification.message.sender_id}`);
      setNotification({ show: false, message: null });
    }
  };

  if (!notification.show || !notification.message) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 max-w-sm cursor-pointer hover:shadow-3xl transition-all duration-200"
        onClick={handleNotificationClick}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
            {notification.message.sender_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-gray-900 truncate">
                {notification.message.sender_name}
              </p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setNotification({ show: false, message: null });
                }}
                title="Dismiss notification"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {notification.message.content}
            </p>
            <p className="text-xs text-indigo-500 mt-2 font-medium">
              Click to view conversation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
