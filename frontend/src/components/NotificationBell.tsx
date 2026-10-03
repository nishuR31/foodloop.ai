import { useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notificationsRes } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data;
    },
    refetchInterval: 60000 // refetch every minute automatically
  });

  const notifications: Notification[] = notificationsRes || [];
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      queryClient.setQueryData(['notifications'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((n: Notification) => n.id === id ? { ...n, read: true } : n);
      });
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} New</span>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  onClick={() => !notification.read && markAsRead(notification.id)}
                  className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${!notification.read ? 'bg-emerald-50/30' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm font-semibold ${!notification.read ? 'text-slate-900' : 'text-slate-600'}`}>{notification.title}</h4>
                    {!notification.read && <span className="h-2 w-2 bg-emerald-500 rounded-full mt-1.5 shrink-0"></span>}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{notification.message}</p>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">
                    {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
