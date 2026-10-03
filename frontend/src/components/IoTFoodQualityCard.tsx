'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSocket } from '@/components/SocketProvider';
import { Activity, Flame, Wind, Droplets, Thermometer, ShieldAlert, ShieldCheck } from 'lucide-react';

interface IoTFoodQualityCardProps {
  title?: string;
  subtitle?: string;
  contextTag?: string;
  className?: string;
  compact?: boolean;
}

export default function IoTFoodQualityCard({
  title = 'Live Food Spoilage & Freshness Monitor',
  subtitle = 'Real-time telemetry from container sensor node (DHT22 + MQ-2 + MQ-3)',
  contextTag = 'Live IoT Node',
  className = '',
  compact = false,
}: IoTFoodQualityCardProps) {
  const { socket } = useSocket();
  const [liveData, setLiveData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Auto-fetch real latest sensor reading from backend every 3 seconds
  const { data: sensorRes, isLoading, refetch } = useQuery({
    queryKey: ['iot-sensors-latest'],
    queryFn: async () => {
      const res = await api.get('/sensors/latest');
      return res.data?.data;
    },
    refetchInterval: 3000,
  });

  // Real-time WebSocket event listener
  useEffect(() => {
    if (!socket) return;

    const handleSensorData = (data: any) => {
      setLiveData(data);
      setLastUpdated(new Date());
    };

    socket.on('sensor:data', handleSensorData);
    socket.on('sensor_reading', handleSensorData);

    return () => {
      socket.off('sensor:data', handleSensorData);
      socket.off('sensor_reading', handleSensorData);
    };
  }, [socket]);

  // Prefer live WebSocket push, fallback to latest query reading
  const reading = liveData || sensorRes;

  const hasData = Boolean(reading);
  const status = reading?.status || (isLoading ? 'CONNECTING...' : 'STANDBY');
  const score = reading?.spoilageScore != null ? Number(reading.spoilageScore) : null;
  const temp = reading?.temperature != null ? Number(reading.temperature).toFixed(1) : '--';
  const hum = reading?.humidity != null ? Number(reading.humidity).toFixed(1) : '--';
  const mq2 = reading?.mq2Raw != null ? String(reading.mq2Raw) : '--';
  const mq3 = reading?.mq3Raw != null ? String(reading.mq3Raw) : '--';
  const deviceId = reading?.deviceId || 'ESP32_FOOD_001';

  const isSpoiled = status === 'SPOILED' || (score !== null && score > 50);
  const isCaution = status === 'CAUTION' || (score !== null && score >= 25 && score <= 50);

  const statusColor = isSpoiled
    ? 'bg-rose-500 text-white shadow-rose-500/20'
    : isCaution
    ? 'bg-amber-500 text-white shadow-amber-500/20'
    : 'bg-emerald-500 text-white shadow-emerald-500/20';

  const borderAccent = isSpoiled
    ? 'border-rose-500/30'
    : isCaution
    ? 'border-amber-500/30'
    : 'border-emerald-500/30';

  if (isLoading && !reading) {
    return (
      <div className={`p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white animate-pulse ${className}`}>
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="h-16 bg-slate-800 rounded-2xl"></div>
          <div className="h-16 bg-slate-800 rounded-2xl"></div>
          <div className="h-16 bg-slate-800 rounded-2xl"></div>
          <div className="h-16 bg-slate-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white border shadow-xl shadow-slate-950/20 overflow-hidden ${borderAccent} ${className}`}
    >
      {/* Header bar */}
      <div className="px-6 py-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                {contextTag}
              </span>
              <span className="text-xs font-mono text-slate-400">ID: {deviceId}</span>
            </div>
            <h3 className="font-bold text-sm sm:text-base text-white mt-0.5">{title}</h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Spoilage Score
            </span>
            <span className="text-xl sm:text-2xl font-black text-white">
              {score !== null ? score.toFixed(1) : '--'}
              <span className="text-xs font-normal text-slate-400"> / 100</span>
            </span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg ${statusColor}`}>
            {status}
          </div>
        </div>
      </div>

      {/* Main metrics section */}
      <div className="p-6">
        {!compact && (
          <div className="mb-4">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                {isSpoiled ? (
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                )}
                Safety Assessment: {isSpoiled ? 'Decomposition Detected' : isCaution ? 'Elevated Environmental Risk' : 'Fresh & Certified Safe'}
              </span>
              <span className="font-mono text-slate-400">
                {score === null ? 'Standby' : score <= 20 ? 'Optimal' : score <= 40 ? 'Moderate' : 'Critical'}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-700 rounded-full ${
                  isSpoiled
                    ? 'bg-rose-500'
                    : isCaution
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(score ?? 0, 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 4 Sensor telemetry blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Temperature */}
          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Temperature</span>
              <Thermometer className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-white tracking-tight">{temp}°C</div>
            <div className="text-[10px] text-slate-500 mt-0.5">DHT22 Digital</div>
          </div>

          {/* Humidity */}
          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Humidity</span>
              <Droplets className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-white tracking-tight">{hum}%</div>
            <div className="text-[10px] text-slate-500 mt-0.5">DHT22 Digital</div>
          </div>

          {/* MQ-2 Gas */}
          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Gas / Smoke</span>
              <Wind className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white tracking-tight">{mq2}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">MQ-2 ADC Raw</div>
          </div>

          {/* MQ-3 Alcohol */}
          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">VOC / Alcohol</span>
              <Flame className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <div className="text-lg font-bold text-white tracking-tight">{mq3}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">MQ-3 Ferment.</div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Real-time Telemetry Active
          </span>
          <span className="text-slate-500">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
