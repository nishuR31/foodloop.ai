'use client';

import { Heart, Users, Utensils, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ImpactReports() {
  const [meals, setMeals] = useState(14502);

  useEffect(() => {
    const interval = setInterval(() => {
      setMeals(prev => prev + 1);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600 tracking-tight">Community Impact</h1>
        <p className="text-slate-500 mt-2 text-lg">Measure the lives touched and value delivered through surplus redistribution.</p>
      </div>

      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-500/30 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 opacity-10">
          <Heart className="w-96 h-96" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
          <div>
            <p className="text-emerald-100 font-semibold tracking-wider uppercase mb-2">Total Meals Served</p>
            <div className="text-7xl font-black">{meals.toLocaleString()}</div>
          </div>
          <div className="mt-8 md:mt-0 flex space-x-4">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20">
              <Users className="w-8 h-8 mb-4 text-emerald-100" />
              <div className="text-2xl font-bold">1,204</div>
              <p className="text-emerald-100 text-sm">Families Helped</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20">
              <TrendingUp className="w-8 h-8 mb-4 text-emerald-100" />
              <div className="text-2xl font-bold">+14%</div>
              <p className="text-emerald-100 text-sm">This Month</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
