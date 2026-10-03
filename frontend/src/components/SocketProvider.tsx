'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { toast } from 'sonner';

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextProps>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    // Only connect if user is logged in
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      // Join a role-specific room
      if (user.role) {
        socketInstance.emit('join_room', `role_${user.role}`);
      }
      // Join org-specific room
      if (user.organizationId) {
        socketInstance.emit('join_room', `org_${user.organizationId}`);
      }
      // Join personal room
      socketInstance.emit('join_room', `user_${user.id}`);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Global listeners for live notifications
    socketInstance.on('notification', (data) => {
      toast.info(data.title, { description: data.message });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
