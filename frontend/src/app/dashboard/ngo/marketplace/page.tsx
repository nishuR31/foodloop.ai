'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSocket } from '@/components/SocketProvider';
import { ShoppingCart, Search, Filter, Loader2, MapPin, Clock, ShieldCheck, CheckCircle2, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function SurplusMarketplace() {
  const { socket } = useSocket();
  const [searchTerm, setSearchTerm] = useState('');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const { data: surplusRes, isLoading, refetch } = useQuery({
    queryKey: ['available-surplus-marketplace'],
    queryFn: async () => {
      const res = await api.get('/ngos/available-surplus');
      return res.data;
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      refetch();
    };
    socket.on('surplus_updated', handleUpdate);
    return () => {
      socket.off('surplus_updated', handleUpdate);
    };
  }, [socket, refetch]);

  const items: any[] = surplusRes?.data || [];

  const filteredItems = items.filter((item) =>
    item.foodItem.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.kitchen?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.kitchen?.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClaim = async (item: any) => {
    setClaimingId(item.id);
    try {
      await api.post('/ngos/accept-surplus', {
        surplusId: item.id,
        quantityRequested: item.quantitySurplus,
      });
      toast.success(`Successfully claimed ${item.quantitySurplus} ${item.unit} of ${item.foodItem}! Driver assignment initiated.`);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to claim surplus item');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <ShoppingCart className="h-8 w-8 mr-3 text-orange-500" />
            Surplus Food Marketplace
          </h1>
          <p className="text-slate-500 mt-2">Claim surplus food from partnered kitchens, verified by IoT freshness sensors.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search surplus by food type or kitchen location..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-orange-500 transition-all shadow-sm text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-orange-500" />
          <p className="font-medium animate-pulse">Loading live surplus opportunities...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-16 text-center space-y-4">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">No Surplus Available at the Moment</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            All surplus food in your network has been claimed or kitchens have not recorded new surplus yet. You will be notified automatically when new food is listed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item: any) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/70 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className="px-3 py-1 bg-orange-50 text-orange-600 font-black text-xs rounded-full uppercase tracking-wider">
                    Available Now
                  </span>
                  <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200/60">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>IoT Monitored</span>
                  </div>
                </div>

                <h3 className="font-black text-xl text-slate-900 mb-1">{item.foodItem}</h3>

                <div className="flex items-center text-slate-500 text-xs font-medium mb-3">
                  <MapPin className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  {item.kitchen?.name} ({item.kitchen?.location})
                  {item.matchScore !== undefined && item.matchScore !== 999 && (
                    <span className="ml-2 text-indigo-600 font-bold">· {item.matchScore.toFixed(1)} km away</span>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl mb-4 border border-slate-100">
                  <div className="text-xs text-slate-500 font-medium">Quantity Available</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">
                    {item.quantitySurplus} <span className="text-sm font-bold text-slate-500">{item.unit}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400 mb-3">
                  Recorded: {new Date(item.date).toLocaleString()}
                </div>
                <button
                  disabled={claimingId === item.id}
                  onClick={() => handleClaim(item)}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {claimingId === item.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Claim & Request Delivery
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
