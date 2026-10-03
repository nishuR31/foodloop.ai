'use client';

import { Trophy, Star, Shield, Gift } from 'lucide-react';

export default function DriverRewards() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in zoom-in duration-500">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Driver Rewards</h1>
        <p className="text-slate-500 mt-2 text-lg">Unlock achievements, earn badges, and redeem points.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2rem] p-8 text-white shadow-2xl shadow-orange-500/30 flex flex-col items-center justify-center text-center">
          <Trophy className="w-24 h-24 mb-6 text-orange-100" />
          <h2 className="text-2xl font-bold text-orange-50 mb-2">Current Tier: Gold</h2>
          <p className="text-5xl font-black mb-6">4,250 Points</p>
          <div className="w-full bg-orange-900/20 rounded-full h-3 mb-2">
            <div className="bg-white h-full rounded-full" style={{ width: '85%' }}></div>
          </div>
          <p className="text-orange-100 text-sm">750 points to Platinum Tier</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Recent Badges</h3>
          
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center">
            <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600 mr-4">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">100th Delivery</h4>
              <p className="text-sm text-slate-500">Completed 100 successful surplus deliveries.</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center">
            <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600 mr-4">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Safe Driver</h4>
              <p className="text-sm text-slate-500">Maintained a perfect safety score for 30 days.</p>
            </div>
          </div>
          
          <button className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-colors flex items-center justify-center mt-4">
            <Gift className="w-5 h-5 mr-2" /> Redeem Points
          </button>
        </div>
      </div>
    </div>
  );
}
