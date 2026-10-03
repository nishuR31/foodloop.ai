'use client';

import { Activity, Battery, Car, Navigation2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function VehicleDiagnostics() {
  const [fuel, setFuel] = useState(82);

  useEffect(() => {
    const interval = setInterval(() => {
      setFuel(prev => Math.max(0, prev - (Math.random() * 0.1)));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in slide-in-from-left-8 duration-500">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Vehicle Diagnostics</h1>
        <p className="text-slate-500 mt-2 text-lg">Live telemetry for your delivery vehicle.</p>
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
          <Car className="w-96 h-96 text-blue-500" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
          <div>
            <div className="text-slate-400 text-sm mb-1 flex items-center">
              <Battery className="w-4 h-4 mr-2" /> Fuel / EV Battery
            </div>
            <div className="text-4xl font-black text-blue-400">{fuel.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-slate-400 text-sm mb-1 flex items-center">
              <Activity className="w-4 h-4 mr-2" /> Engine Temp
            </div>
            <div className="text-4xl font-black text-emerald-400">90°C</div>
          </div>
          <div>
            <div className="text-slate-400 text-sm mb-1 flex items-center">
              <Navigation2 className="w-4 h-4 mr-2" /> GPS Signal
            </div>
            <div className="text-4xl font-black text-emerald-400">Strong</div>
          </div>
          <div>
            <div className="text-slate-400 text-sm mb-1">Tire Pressure</div>
            <div className="text-4xl font-black text-white">32 PSI</div>
          </div>
        </div>
      </div>
    </div>
  );
}
