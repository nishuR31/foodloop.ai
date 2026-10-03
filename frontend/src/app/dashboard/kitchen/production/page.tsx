'use client';

import { LineChart, BarChart2, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ProductionAnalytics() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
          <LineChart className="h-8 w-8 mr-3 text-indigo-500" />
          Production & Analytics
        </h1>
        <p className="text-slate-500 mt-2">AI-driven insights for optimizing your daily kitchen production.</p>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-indigo-500" />
          <p className="font-medium animate-pulse">Running predictive models...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* AI Insight Card */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10">
              <TrendingUp className="h-64 w-64" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center mb-4 text-indigo-100 font-bold tracking-widest text-sm uppercase">
                <AlertTriangle className="h-4 w-4 mr-2" />
                AI Production Alert
              </div>
              <h2 className="text-3xl font-black mb-2">Reduce tomorrow's lunch by 8%</h2>
              <p className="text-indigo-100 max-w-2xl text-lg">
                Based on historical data and local weather patterns, demand is expected to drop. Reducing production will prevent approximately 12kg of surplus food waste.
              </p>
              <div className="mt-6 flex space-x-4">
                <button className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold shadow-md hover:bg-slate-50 transition-colors">
                  Apply Recommendation
                </button>
                <button className="bg-indigo-600/50 hover:bg-indigo-600/80 text-white px-6 py-3 rounded-xl font-bold border border-indigo-400/30 transition-colors">
                  View Full Report
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                <BarChart2 className="h-5 w-5 mr-2 text-blue-500" />
                Weekly Waste Trend
              </h3>
              <div className="h-64 w-full flex items-end justify-between px-2 space-x-2">
                {/* Simulated Chart Bars */}
                {[40, 65, 30, 20, 80, 45, 15].map((height, i) => (
                  <div key={i} className="w-full bg-slate-100 rounded-t-lg relative group">
                    <div 
                      className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg transition-all duration-1000 group-hover:opacity-80"
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-xs font-bold text-slate-400 uppercase">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Top Surplus Items</h3>
              <div className="space-y-4">
                {[
                  { name: 'Steamed Rice', amount: '45 kg', pct: 85 },
                  { name: 'Mixed Vegetables', amount: '22 kg', pct: 40 },
                  { name: 'Bread', amount: '15 loaves', pct: 25 },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-slate-700">{item.name}</span>
                      <span className="font-bold text-slate-900">{item.amount}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${item.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
