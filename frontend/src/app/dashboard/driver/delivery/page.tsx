'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CheckCircle2, MapPin, Truck, AlertTriangle, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import dynamic from 'next/dynamic';

const RouteMap = dynamic(() => import('@/components/Map/RouteMap'), { ssr: false });

export default function DeliveryDashboard() {
  const { data: delRes, isLoading, refetch } = useQuery({
    queryKey: ['driver-deliveries'],
    queryFn: async () => {
      const res = await api.get('/deliveries');
      // format for driver
      return res.data.data.map((d: any) => ({
        id: d.id,
        status: d.status,
        pickupTime: d.pickupTime,
        deliveryTime: d.deliveryTime,
        surplus: d.redistribution.surplus,
        ngo: d.redistribution.ngo,
        routeOptimized: d.calculatedRoute || null
      }));
    },
    refetchInterval: 5000
  });

  const deliveries = delRes || [];

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.put(`/deliveries/${id}/status`, { status: newStatus });
      toast.success(`Delivery status updated to ${newStatus}`);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  if (isLoading) return <DashboardSkeleton />;

  const pendingDeliveries = deliveries.filter((d: any) => d.status !== 'DELIVERED');
  const completedDeliveries = deliveries.filter((d: any) => d.status === 'DELIVERED');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Driver Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage and track your active deliveries.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Truck className="h-5 w-5 text-indigo-500" />
                Active Deliveries
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingDeliveries.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No active deliveries at the moment.
                </div>
              ) : (
                pendingDeliveries.map((delivery: any) => (
                  <div key={delivery.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                            {delivery.status}
                          </span>
                          <span className="text-sm font-medium text-slate-700">
                            {delivery.surplus.quantitySurplus} {delivery.surplus.unit} {delivery.surplus.foodItem}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                          <div>
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pickup</div>
                            <div className="font-medium text-slate-800">{delivery.surplus.kitchen?.name || 'Kitchen'}</div>
                            <div className="text-xs mt-1 truncate">{delivery.surplus.kitchen?.location || 'Unknown location'}</div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Drop-off</div>
                            <div className="font-medium text-slate-800">{delivery.ngo.name}</div>
                            <div className="text-xs mt-1 truncate">{delivery.ngo.location}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[140px] justify-center">
                        {delivery.status === 'PENDING' && (
                          <button
                            onClick={() => handleUpdateStatus(delivery.id, 'PICKED_UP')}
                            className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all"
                          >
                            Mark Picked Up
                          </button>
                        )}
                        {delivery.status === 'PICKED_UP' && (
                          <button
                            onClick={() => handleUpdateStatus(delivery.id, 'IN_TRANSIT')}
                            className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-500 transition-all"
                          >
                            Start Transit
                          </button>
                        )}
                        {delivery.status === 'IN_TRANSIT' && (
                          <button
                            onClick={() => handleUpdateStatus(delivery.id, 'DELIVERED')}
                            className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition-all"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Navigation className="h-5 w-5 text-indigo-500" />
              Live Route Navigation
            </h2>
            <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-200">
               <RouteMap tasks={pendingDeliveries} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Truck className="h-24 w-24" />
            </div>
            <h3 className="font-medium text-indigo-100 mb-1 relative z-10">Today's Deliveries</h3>
            <div className="text-4xl font-bold mb-4 relative z-10">{completedDeliveries.length}</div>
            <div className="text-sm text-indigo-100 relative z-10">
              Completed successfully today
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">Recent Deliveries</h3>
             </div>
             <div className="p-5 space-y-4">
                {completedDeliveries.slice(0, 5).map((delivery: any) => (
                  <div key={delivery.id} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-slate-700">
                        {delivery.surplus.quantitySurplus} {delivery.surplus.unit} of {delivery.surplus.foodItem}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Delivered to {delivery.ngo.name}
                      </div>
                    </div>
                  </div>
                ))}
                {completedDeliveries.length === 0 && (
                  <div className="text-sm text-slate-500 text-center py-2">No recent deliveries.</div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
