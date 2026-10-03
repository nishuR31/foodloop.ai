'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CheckCircle2, MapPin, Package, Truck, Map as MapIcon, BellCheck, BellDot } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { useSocket } from '@/components/SocketProvider';
import dynamic from 'next/dynamic';

const RouteMap = dynamic(() => import('@/components/Map/RouteMap'), { ssr: false });

export default function NgoDashboard() {
  const { data: surplusRes, isLoading: loadingSurplus, refetch: refetchSurplus } = useQuery({
    queryKey: ['available-surplus'],
    queryFn: async () => {
      const res = await api.get('/ngos/available-surplus');
      return res.data.data;
    },
    refetchInterval: 5000
  });

  const { data: statsRes, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/ngos/dashboard-stats');
      return res.data.data;
    },
    refetchInterval: 5000
  });

  const { data: delRes, isLoading: loadingDel } = useQuery({
    queryKey: ['ngo-deliveries'],
    queryFn: async () => {
      const res = await api.get('/deliveries');
      return res.data.data.map((d: any) => ({
        id: d.id,
        status: d.status,
        surplus: d.redistribution.surplus,
        ngo: d.redistribution.ngo,
        routeOptimized: d.calculatedRoute
      }));
    },
    refetchInterval: 5000
  });

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      refetchSurplus();
      refetchStats();
      toast.success('New Surplus Available Nearby!', { icon: <BellDot /> });
    };
    socket.on('surplus_updated', handleUpdate);
    return () => {
      socket.off('surplus_updated', handleUpdate);
    };
  }, [socket, refetchSurplus, refetchStats]);

  const surpluses = surplusRes || [];
  const stats = statsRes || { acceptedToday: 0, pendingArrival: 0 };
  const deliveries = delRes || [];
  const loading = loadingSurplus || loadingStats || loadingDel;

  const handleAccept = async (id: string, quantity: number) => {
    try {
      await api.post('/ngos/accept-surplus', { surplusId: id, quantityRequested: quantity });
      toast.success('Surplus accepted and delivery scheduled!');
      refetchSurplus();
      refetchStats();
    } catch (err) {
      toast.error('Error accepting surplus');
    }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 md:space-y-10 animate-fade-in-up">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">NGO Dashboard</h1>
          <p className="text-slate-500 mt-1">Accept food surplus and track your incoming deliveries.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Available Near You', value: surpluses.length, sub: 'Opportunities matched', icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { title: 'Accepted Today', value: stats.acceptedToday, sub: 'Deliveries scheduled', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50' },
          { title: 'Pending Arrival', value: stats.pendingArrival, sub: 'In transit', icon: Truck, color: 'text-amber-500', bg: 'bg-amber-50' }
        ].map((stat, i) => (
          <div key={i} className="group relative bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200/70 transition-all duration-300 overflow-hidden">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${stat.bg} opacity-50 group-hover:scale-150 transition-transform duration-500 -z-10`}></div>
            <div className={`flex items-center gap-3 ${stat.color} mb-3`}>
              <div className={`p-2 rounded-xl ${stat.bg}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-700 tracking-tight">{stat.title}</h3>
            </div>
            <p className="text-4xl font-extrabold text-slate-900 tracking-tight">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-2 font-medium">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden mt-8">
        <div className="px-4 md:px-8 py-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Package className="h-4 w-4" /></div>
            Available Surplus Opportunities
          </h3>
        </div>
        <div className="divide-y divide-slate-50">
          {surpluses.map((surplus: any) => (
            <div key={surplus.id} className="p-4 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-slate-50/50 transition-colors">
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="text-xl font-bold text-slate-900">{surplus.foodItem}</h4>
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100/80 text-emerald-700">
                    {surplus.quantitySurplus} {surplus.unit}
                  </span>
                </div>
                <div className="flex items-center text-slate-500 mt-3 text-sm font-medium">
                  <MapPin className="h-4 w-4 mr-1.5 text-slate-400" />
                  {surplus.kitchen.name} — {surplus.kitchen.location}
                </div>
                <p className="text-sm text-slate-400 mt-2 font-medium">Generated: {new Date(surplus.date).toLocaleString()}</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button
                  onClick={() => handleAccept(surplus.id, surplus.quantitySurplus)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-3 rounded-xl shadow-lg shadow-emerald-500/30 font-bold hover:shadow-emerald-500/50 w-full md:w-auto transition-all hover:-translate-y-0.5"
                >
                  Accept & Request Delivery
                </button>
              </div>
            </div>
          ))}
          {surpluses.length === 0 && (
            <div className="p-8 md:p-16 text-center text-slate-500 border border-dashed border-slate-200 m-4 md:m-8 rounded-2xl bg-slate-50/50">
              <Package className="h-16 w-16 mx-auto text-slate-300 mb-6" />
              <p className="text-xl font-bold text-slate-900 tracking-tight">No surplus available right now</p>
              <p className="mt-2 font-medium">We'll notify you when new food is matched to your location.</p>
            </div>
          )}
        </div>
      </div>

      {/* Live Route Map for Incoming Deliveries */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 p-4 md:p-6 mt-8">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4 flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-indigo-500" /> Incoming Deliveries Tracking
        </h3>
        <RouteMap tasks={deliveries} />
      </div>
    </div>
  );
}
