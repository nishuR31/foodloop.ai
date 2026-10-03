'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSocket } from '@/components/SocketProvider';
import { useEffect, useState } from 'react';
import { Bell, Thermometer, ShieldAlert, CheckCircle2, AlertOctagon, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function IoTAlerts() {
  const { socket } = useSocket();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { data: alertsRes, isLoading, refetch } = useQuery({
    queryKey: ['iot-alerts'],
    queryFn: async () => {
      const res = await api.get('/sensors/alerts');
      return res.data;
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!socket) return;
    const handleNewAlert = (alertData: any) => {
      refetch();
      if (alertData?.alerts && alertData.alerts.length > 0) {
        alertData.alerts.forEach((a: any) => {
          toast.error(a.title, { description: a.message });
        });
      }
    };

    socket.on('sensor:alert', handleNewAlert);
    return () => {
      socket.off('sensor:alert', handleNewAlert);
    };
  }, [socket, refetch]);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await api.patch(`/sensors/alerts/${id}/resolve`);
      toast.success('Alert resolved and marked acknowledged');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to resolve alert');
    } finally {
      setResolvingId(null);
    }
  };

  const alerts = alertsRes?.alerts || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldAlert className="h-9 w-9 text-rose-600" />
            IoT Sensor Alerts
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Real-time alerts from smart storage, temperature, and spoilage nodes.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-2xl text-slate-700 font-semibold text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Stream Active
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500 mb-3" />
          <p className="font-medium">Loading active sensor alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-emerald-50/50 border border-dashed border-emerald-200 rounded-3xl p-16 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">All Storage Conditions Safe</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            No active anomalies detected across ESP32 food freshness nodes or cold storage units.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {alerts.map((alert: any) => {
            const isCrit = alert.severity === 'CRITICAL';
            const isWarn = alert.severity === 'WARNING';

            const bgClass = isCrit ? 'bg-red-50/70 border-red-200' : isWarn ? 'bg-amber-50/70 border-amber-200' : 'bg-blue-50/70 border-blue-200';
            const iconBg = isCrit ? 'bg-red-100 text-red-600' : isWarn ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600';
            const badgeClass = isCrit ? 'bg-red-600 text-white' : isWarn ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white';
            const btnClass = isCrit ? 'bg-red-600 hover:bg-red-700 text-white' : isWarn ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';

            return (
              <div
                key={alert.id}
                className={`${bgClass} p-6 rounded-3xl border shadow-xl shadow-slate-200/40 relative overflow-hidden transition-all hover:-translate-y-0.5`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 ${iconBg} rounded-2xl shadow-sm`}>
                    {isCrit ? <AlertOctagon className="h-6 w-6" /> : isWarn ? <Thermometer className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
                  </div>
                  <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm ${badgeClass}`}>
                    {alert.severity}
                  </span>
                </div>
                <h3 className="text-slate-900 font-bold text-xl mb-2">{alert.title}</h3>
                <p className="text-slate-600 mb-5 leading-relaxed text-sm">{alert.message}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <span className="text-xs text-slate-400 font-medium">
                    {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'Just now'}
                  </span>
                  <button
                    disabled={resolvingId === alert.id}
                    onClick={() => handleResolve(alert.id)}
                    className={`${btnClass} px-5 py-2 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 disabled:opacity-50`}
                  >
                    {resolvingId === alert.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Acknowledge
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
