'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Users, BarChart3, TrendingDown, Factory, HeartHandshake, Banknote, Droplets, MapPin, Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const GlobalHeatmap = dynamic(() => import('@/components/Map/GlobalHeatmap'), { ssr: false });

export default function AdminDashboard() {
  const { data: statsRes, isLoading: loadingStats } = useQuery({
    queryKey: ['system-overview'],
    queryFn: async () => {
      const res = await api.get('/analytics/system-overview');
      return res.data.data;
    },
    refetchInterval: 3000
  });

  const { data: activityRes, isLoading: loadingActivity } = useQuery({
    queryKey: ['activity-timeline'],
    queryFn: async () => {
      const res = await api.get('/analytics/activity-timeline');
      return res.data.data;
    },
    refetchInterval: 3000
  });

  const { data: orgsRes, isLoading: loadingOrgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const res = await api.get('/analytics/organizations');
      return res.data.data;
    },
    refetchInterval: 3000
  });

  const { data: auditRes, isLoading: loadingAudit } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await api.get('/audit-logs');
      return res.data.data;
    },
    refetchInterval: 3000
  });

  const stats = statsRes || null;
  const activity = activityRes || [];
  const orgs = orgsRes || [];
  const auditLogs = auditRes || [];

  const loading = loadingStats || loadingActivity || loadingOrgs || loadingAudit;

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <HeartHandshake className="text-emerald-500 h-12 w-12 mb-4 animate-bounce" />
        <div className="text-emerald-600 font-medium tracking-wide">Loading System Analytics...</div>
      </div>
    </div>
  );

  const mockChartData = [
    { name: 'Mon', co2: 400, waste: 240, meals: 480 },
    { name: 'Tue', co2: 300, waste: 139, meals: 278 },
    { name: 'Wed', co2: 200, waste: 980, meals: 1960 },
    { name: 'Thu', co2: 278, waste: 390, meals: 780 },
    { name: 'Fri', co2: 189, waste: 480, meals: 960 },
    { name: 'Sat', co2: 239, waste: 380, meals: 760 },
    { name: 'Sun', co2: 349, waste: 430, meals: 860 },
  ];

  const handleGenerateReport = () => {
    if (!stats || !orgs || !activity) {
      toast.error('Data is still loading, please wait.');
      return;
    }
    const wb = XLSX.utils.book_new();

    const statsSheet = XLSX.utils.json_to_sheet([{
      TotalSurplusRescued_kg: stats.totalSurplusRescued || 0,
      MoneySaved_INR: stats.moneySaved || 0,
      CO2Prevented_kg: stats.co2Prevented || 0,
      WaterSaved_Liters: stats.waterSavedLiters || 0,
      ActiveKitchens: stats.activeOrgs?.KITCHEN || 0,
      ActiveNGOs: stats.activeOrgs?.NGO || 0,
    }]);

    const orgsSheet = XLSX.utils.json_to_sheet(orgs.map((org: any) => ({
      Name: org.name,
      Type: org.type,
      Users: org._count?.users || 0,
      Joined: new Date(org.createdAt).toLocaleDateString()
    })));

    const activitySheet = XLSX.utils.json_to_sheet(activity.map((act: any) => ({
      Title: act.title,
      Description: act.description,
      Status: act.status,
      Time: new Date(act.timestamp).toLocaleString()
    })));

    const auditSheet = XLSX.utils.json_to_sheet(auditLogs.map((log: any) => ({
      Action: log.action,
      Entity: `${log.entityType} (${log.entityId})`,
      BlockchainHash: log.blockchainHash || 'N/A',
      Time: new Date(log.createdAt).toLocaleString()
    })));

    XLSX.utils.book_append_sheet(wb, statsSheet, 'System Stats');
    XLSX.utils.book_append_sheet(wb, orgsSheet, 'Organizations');
    XLSX.utils.book_append_sheet(wb, activitySheet, 'Activity');
    XLSX.utils.book_append_sheet(wb, auditSheet, 'Audit Trail');

    XLSX.writeFile(wb, `FoodLoop_Admin_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report generated successfully');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 md:space-y-10 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Overview</h1>
          <p className="text-slate-500 mt-1">Monitor the pulse of the FoodLoop network.</p>
        </div>
        <button onClick={handleGenerateReport} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 text-sm font-semibold hover:scale-105 hover:shadow-emerald-500/40 transition-all duration-300 ease-in-out">
          Generate Full Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[
          { title: 'Total Food Rescued', value: `${stats?.totalSurplusRescued || 0} kg`, sub: 'Across all kitchens', icon: HeartHandshake, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { title: 'Money Saved', value: `₹${stats?.moneySaved || 0}`, sub: 'Estimated cost savings', icon: Banknote, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { title: 'Active Organizations', value: (stats?.activeOrgs?.KITCHEN || 0) + (stats?.activeOrgs?.NGO || 0), sub: 'Kitchens & NGOs', icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' }
        ].map((stat, i) => (
          <div key={i} className="group relative bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200/70 transition-all duration-300 ease-in-out overflow-hidden">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${stat.bg} opacity-50 group-hover:scale-150 transition-transform duration-500 ease-in-out -z-10`}></div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {[
          { title: 'CO2 Prevented', value: `${stats?.co2Prevented || 0} kg`, sub: 'Environmental Impact', icon: TrendingDown, color: 'text-blue-500', bg: 'bg-blue-50' },
          { title: 'Water Saved', value: `${stats?.waterSavedLiters || 0} L`, sub: 'Environmental Impact', icon: Droplets, color: 'text-cyan-500', bg: 'bg-cyan-50' }
        ].map((stat, i) => (
          <div key={i} className="group relative bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200/70 transition-all duration-300 ease-in-out overflow-hidden">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${stat.bg} opacity-50 group-hover:scale-150 transition-transform duration-500 ease-in-out -z-10`}></div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 p-4 md:p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Recent Platform Activity</h3>
          </div>
          <div className="space-y-6">
            {activity.length > 0 ? (
              <div className="relative border-l-2 border-slate-100 ml-4 space-y-8">
                {activity.map((act: any) => (
                  <div key={act.id} className="relative pl-8 group">
                    <div className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-4 border-white shadow-sm ${
                      act.status === 'DELIVERED' ? 'bg-emerald-500' :
                      act.status === 'ACCEPTED' ? 'bg-blue-500' :
                      'bg-amber-500'
                    } group-hover:scale-125 transition-transform duration-300`}></div>
                    <p className="text-base font-bold text-slate-900">{act.title}</p>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{act.description}</p>
                    <p className="text-xs font-semibold text-slate-400 mt-2 uppercase tracking-wider">{new Date(act.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-slate-50/50 rounded-2xl text-sm font-medium text-slate-500 text-center border border-dashed border-slate-200">
                No recent activity found.
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 p-4 md:p-8 overflow-hidden">
           <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-8">Weekly Impact Metrics</h3>
           <div className="h-72 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={mockChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                 <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'}}
                 />
                 <Bar dataKey="co2" name="CO2 Saved (kg)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="waste" name="Waste Prevented (kg)" fill="#10b981" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="meals" name="Meals Saved" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-8 mt-8">
        <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 p-4 md:p-8 overflow-hidden">
           <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-8">Registered Organizations</h3>
           <div className="overflow-x-auto">
            {orgs.length > 0 ? (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Name</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Type</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Users</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orgs.map((org: any) => (
                    <tr key={org.id} className="hover:bg-slate-50/50 transition-colors duration-200">
                      <td className="px-4 py-5 whitespace-nowrap text-sm font-bold text-slate-900">{org.name}</td>
                      <td className="px-4 py-5 whitespace-nowrap text-sm text-slate-500">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                          org.type === 'KITCHEN' ? 'bg-orange-100/80 text-orange-700' :
                          org.type === 'NGO' ? 'bg-purple-100/80 text-purple-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {org.type}
                        </span>
                      </td>
                      <td className="px-4 py-5 whitespace-nowrap text-sm font-medium text-slate-600">{org._count?.users || 0}</td>
                      <td className="px-4 py-5 whitespace-nowrap text-sm font-medium text-slate-500">{new Date(org.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 bg-slate-50/50 rounded-2xl text-sm font-medium text-slate-500 text-center border border-dashed border-slate-200">
                No organizations registered yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 mt-8">
        {/* Global Heatmap */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 p-4 md:p-8 overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
              <MapPin className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Network Activity Heatmap</h3>
            <span className="ml-auto bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">Live View</span>
          </div>
          <GlobalHeatmap orgs={orgs} />
        </div>

        {/* Immutable Audit Trail */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 p-4 md:p-8 overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Immutable Audit Trail</h3>
            <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200">Blockchain Synced</span>
          </div>
          
          <div className="overflow-x-auto">
            {auditLogs.length > 0 ? (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Time</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Action</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Entity</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Blockchain Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors duration-200">
                      <td className="px-4 py-5 whitespace-nowrap text-xs font-medium text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-5 whitespace-nowrap text-sm font-bold text-slate-900">{log.action}</td>
                      <td className="px-4 py-5 whitespace-nowrap text-xs text-slate-500">{log.entityType} ({log.entityId.substring(0, 8)}...)</td>
                      <td className="px-4 py-5 whitespace-nowrap text-xs font-mono text-slate-400 bg-slate-50 rounded px-2">{log.blockchainHash ? log.blockchainHash.substring(0, 16) + '...' : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 bg-slate-50/50 rounded-2xl text-sm font-medium text-slate-500 text-center border border-dashed border-slate-200">
                No audit logs available yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
