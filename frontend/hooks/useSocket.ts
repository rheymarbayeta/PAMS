import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

export const useSocket = () => {
  const { user, token } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || !token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const socket = io(apiUrl, {
      auth: {
        token,
        userId: user.user_id,
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, token]);

  return socketRef.current;
};

