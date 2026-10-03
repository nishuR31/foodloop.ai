'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Navigation, MapPin, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import dynamic from 'next/dynamic';
import { useSocket } from '@/components/SocketProvider';
import { useEffect } from 'react';

const RouteMap = dynamic(() => import('@/components/Map/RouteMap'), { ssr: false });

export default function DriverDashboard() {
  const queryClient = useQueryClient();
  const { data: tasksRes, isLoading, refetch } = useQuery({
    queryKey: ['deliveries'],
    queryFn: async () => {
      const res = await api.get('/deliveries');
      return res.data.data.map((d: any) => ({
        id: d.id,
        status: d.status,
        surplus: d.redistribution.surplus,
        ngo: d.redistribution.ngo,
        routeOptimized: d.calculatedRoute
      }));
    }
  });

  const { data: availableTasksRes, refetch: refetchAvailable } = useQuery({
    queryKey: ['available-deliveries'],
    queryFn: async () => {
      const res = await api.get('/deliveries/available');
      return res.data.data.map((d: any) => ({
        id: d.id,
        status: d.status,
        surplus: d.redistribution.surplus,
        ngo: d.redistribution.ngo,
        routeOptimized: d.calculatedRoute
      }));
    }
  });

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      refetch();
      refetchAvailable();
    };
    socket.on('delivery_updated', handleUpdate);
    return () => {
      socket.off('delivery_updated', handleUpdate);
    };
  }, [socket, refetch]);

  const tasks = tasksRes || [];
  const availableTasks = availableTasksRes || [];

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.post(`/deliveries/${id}/status`, { status });
      
      // Optimistic update
      queryClient.setQueryData(['deliveries'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((t: any) => t.id === id ? { ...t, status } : t);
      });
      
      toast.success('Status updated successfully');
      refetch();
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  const handleClaim = async (id: string) => {
    try {
      await api.post(`/deliveries/${id}/claim`);
      toast.success('Delivery claimed successfully!');
      refetch();
      refetchAvailable();
    } catch (err) {
      toast.error('Error claiming delivery');
    }
  };

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-10 animate-fade-in-up">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Driver Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage your active deliveries and optimized routes.</p>
        </div>
      </div>

      {/* Live Map Section */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 p-6">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-indigo-500" /> Live Route Tracking
        </h3>
        <RouteMap tasks={tasks} />
      </div>

      {availableTasks.length > 0 && (
        <div className="bg-white/80 backdrop-blur-md border border-amber-200 rounded-3xl shadow-xl overflow-hidden">
          <div className="px-4 md:px-8 py-5 border-b border-amber-100 bg-amber-50/50 flex items-center gap-3">
            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
              <Navigation className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Available Deliveries</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {availableTasks.map((task: any) => (
              <div key={task.id} className="p-4 md:p-8 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-8">
                  <div className="flex-1 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-100/80 text-amber-700">
                        AVAILABLE
                      </span>
                      <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">Route: {task.routeOptimized?.distanceText || 'N/A'}</span>
                    </div>
                    <div className="relative pl-8 space-y-8">
                      <div className="absolute top-3 bottom-3 left-[15px] w-0.5 bg-slate-200"></div>
                      <div className="relative">
                        <div className="absolute -left-[37px] top-1 h-5 w-5 rounded-full border-4 border-emerald-500 bg-white shadow-sm"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pickup from</p>
                        <p className="text-lg font-bold text-slate-900">{task.surplus.kitchen.name}</p>
                        <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {task.surplus.kitchen.location}</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[37px] top-1 h-5 w-5 rounded-full border-4 border-blue-500 bg-white shadow-sm"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Deliver to</p>
                        <p className="text-lg font-bold text-slate-900">{task.ngo.name}</p>
                        <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {task.ngo.location}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center gap-4 md:min-w-[220px]">
                    <button 
                      onClick={() => handleClaim(task.id)}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3.5 rounded-xl shadow-lg shadow-amber-500/30 font-bold hover:shadow-amber-500/50 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5" /> Claim Delivery
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="px-4 md:px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
            <Navigation className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Active Deliveries</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {tasks.map((task: any) => (
            <div key={task.id} className="p-4 md:p-8 hover:bg-slate-50/50 transition-colors">
              <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-8">
                
                {/* Route Info */}
                <div className="flex-1 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider
                      ${task.status === 'PENDING' ? 'bg-slate-100 text-slate-600' :
                        task.status === 'IN_TRANSIT' ? 'bg-blue-100/80 text-blue-700' :
                        'bg-emerald-100/80 text-emerald-700'}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">Route: {task.routeOptimized.distanceText} ({task.routeOptimized.durationText})</span>
                  </div>

                  <div className="relative pl-8 space-y-8">
                    {/* Vertical line connecting pickup and dropoff */}
                    <div className="absolute top-3 bottom-3 left-[15px] w-0.5 bg-slate-200"></div>
                    
                    {/* Pickup */}
                    <div className="relative">
                      <div className="absolute -left-[37px] top-1 h-5 w-5 rounded-full border-4 border-emerald-500 bg-white shadow-sm"></div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pickup from</p>
                      <p className="text-lg font-bold text-slate-900">{task.surplus.kitchen.name}</p>
                      <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {task.surplus.kitchen.location}</p>
                    </div>
                    
                    {/* Dropoff */}
                    <div className="relative">
                      <div className="absolute -left-[37px] top-1 h-5 w-5 rounded-full border-4 border-blue-500 bg-white shadow-sm"></div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Deliver to</p>
                      <p className="text-lg font-bold text-slate-900">{task.ngo.name}</p>
                      <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {task.ngo.location}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col justify-center gap-4 md:min-w-[220px]">
                  {(task.status === 'PENDING' || task.status === 'ASSIGNED') && (
                    <button 
                      onClick={() => handleUpdateStatus(task.id, 'IN_TRANSIT')}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3.5 rounded-xl shadow-lg shadow-blue-500/30 font-bold hover:shadow-blue-500/50 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                      <Clock className="h-5 w-5" /> Start Route
                    </button>
                  )}
                  {task.status === 'IN_TRANSIT' && (
                    <button 
                      onClick={() => handleUpdateStatus(task.id, 'DELIVERED')}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 font-bold hover:shadow-emerald-500/50 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5" /> Mark Delivered
                    </button>
                  )}
                  {task.status === 'DELIVERED' && (
                    <div className="w-full bg-slate-50 border border-slate-200 text-slate-600 px-6 py-3.5 rounded-xl font-bold text-center flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-500" /> Completed
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="p-8 md:p-16 text-center text-slate-500 border border-dashed border-slate-200 m-4 md:m-8 rounded-2xl bg-slate-50/50">
              <Navigation className="h-16 w-16 mx-auto text-slate-300 mb-6" />
              <p className="text-xl font-bold text-slate-900 tracking-tight">No active deliveries</p>
              <p className="mt-2 font-medium">You have no pending tasks right now.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
