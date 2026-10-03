'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

const GlobalHeatmap = dynamic(
  () => import('@/components/Map/GlobalHeatmap'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-500" />
        <p className="animate-pulse tracking-widest uppercase text-sm font-bold">Initializing Logistics Subsystem...</p>
      </div>
    )
  }
);

export default function LogisticsOverview() {
  const [organizations, setOrganizations] = useState<any[]>([]);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await api.get('/analytics/organizations');
        if (res.data?.success) setOrganizations(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchOrgs();
  }, []);

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative">
      <div className="absolute top-6 left-6 z-[400] bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-slate-100 max-w-sm pointer-events-auto">
        <h1 className="text-2xl font-black text-slate-900 mb-2">Live Logistics Hub</h1>
        <p className="text-slate-500 text-sm mb-4">Real-time geospatial tracking of all active NGO redistributions and FoodLoop drivers.</p>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-sm font-semibold text-slate-600">Active Drivers</span>
            <span className="text-lg font-black text-emerald-600 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
              24
            </span>
          </div>
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-sm font-semibold text-slate-600">Surplus in Transit</span>
            <span className="text-lg font-black text-indigo-600">1,240 kg</span>
          </div>
        </div>
      </div>
      
      <div className="absolute inset-0 z-0">
        <GlobalHeatmap orgs={organizations} />
      </div>
    </div>
  );
}
