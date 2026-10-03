'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSocket } from '@/components/SocketProvider';
import { Truck, MapPin, Clock, CheckCircle2, Loader2, Package, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function IncomingDeliveries() {
  const { socket } = useSocket();

  const { data: delRes, isLoading, refetch } = useQuery({
    queryKey: ['incoming-deliveries'],
    queryFn: async () => {
      const res = await api.get('/deliveries');
      return res.data;
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      refetch();
    };
    socket.on('delivery_updated', handleUpdate);
    socket.on('surplus_updated', handleUpdate);
    return () => {
      socket.off('delivery_updated', handleUpdate);
      socket.off('surplus_updated', handleUpdate);
    };
  }, [socket, refetch]);

  const deliveries: any[] = delRes?.data || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Truck className="h-8 w-8 mr-3 text-blue-500" />
            Incoming Deliveries
          </h1>
          <p className="text-slate-500 mt-2">Track deliveries assigned to your NGO in real-time.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-500" />
          <p className="font-medium animate-pulse">Syncing with logistics network...</p>
        </div>
      ) : deliveries.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-16 text-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Package className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">No Active Deliveries</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            You currently have no pending arrivals. Claim surplus items in the Marketplace to schedule an automated delivery.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {deliveries.map((del: any) => {
            const surplus = del.redistribution?.surplus;
            const kitchen = surplus?.kitchen;
            const driver = del.driver?.user?.name || del.driver?.vehicleNo || 'Fleet Assigned';

            const statusColors: Record<string, string> = {
              DELIVERED: 'bg-emerald-100 text-emerald-700',
              IN_TRANSIT: 'bg-blue-100 text-blue-700',
              PICKED_UP: 'bg-indigo-100 text-indigo-700',
              ASSIGNED: 'bg-amber-100 text-amber-700',
              PENDING: 'bg-slate-100 text-slate-700',
            };

            return (
              <div
                key={del.id}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-black text-lg text-slate-900">
                      DEL-#{del.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusColors[del.status] || 'bg-slate-100 text-slate-700'}`}>
                      {del.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-slate-700 font-semibold mb-1 flex items-center gap-2">
                    <Package className="h-4 w-4 text-emerald-500" />
                    Food: {surplus ? `${surplus.quantitySurplus} ${surplus.unit} of ${surplus.foodItem}` : 'Food Surplus Consignment'}
                  </div>

                  {kitchen && (
                    <div className="text-slate-500 text-xs font-medium mb-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      Pickup from: {kitchen.name} ({kitchen.location})
                    </div>
                  )}

                  <div className="text-slate-500 text-xs font-medium flex items-center gap-2">
                    <Truck className="h-4 w-4 text-slate-400" />
                    Courier: {driver}
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end md:border-l md:border-slate-100 md:pl-6">
                  <div className="text-left md:text-right mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Assigned Date</p>
                    <p className="text-sm font-bold text-slate-700">
                      {del.pickupTime ? new Date(del.pickupTime).toLocaleString() : 'Scheduled'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>IoT Quality Safe</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
