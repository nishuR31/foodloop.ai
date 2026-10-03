'use client';

import { History, Search, Calendar, Star, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function DeliveryHistory() {
  const [filter, setFilter] = useState('All');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <History className="h-8 w-8 mr-3 text-emerald-500" />
            Delivery History
          </h1>
          <p className="text-slate-500 mt-2">View your past completed deliveries and performance ratings.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Deliveries</p>
          <p className="text-4xl font-black text-emerald-600">142</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex space-x-2">
            {['All', 'This Week', 'This Month'].map((f) => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                  filter === f 
                  ? 'bg-emerald-500 text-white shadow-md' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search history..." 
              className="w-full pl-9 pr-4 py-2 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 text-sm"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {[
            { id: 'DEL-8923', date: 'Oct 24, 2026', time: '14:30 PM', from: 'City Central Kitchen', to: 'Hope Foundation', distance: '4.2 km', rating: 5 },
            { id: 'DEL-8910', date: 'Oct 23, 2026', time: '09:15 AM', from: 'Downtown Catering', to: 'Grace Shelter', distance: '2.1 km', rating: 5 },
            { id: 'DEL-8895', date: 'Oct 21, 2026', time: '18:45 PM', from: 'Sunrise Bakery', to: 'Community Hub', distance: '6.5 km', rating: 4 },
          ].map((log) => (
            <div key={log.id} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="font-bold text-slate-900 mr-3">{log.id}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-500 mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-slate-400" />
                  {log.date} at {log.time}
                </div>
                <div className="text-sm text-slate-600">
                  <span className="font-medium">{log.from}</span> &rarr; <span className="font-medium">{log.to}</span>
                </div>
              </div>
              
              <div className="flex flex-col items-end mt-4 md:mt-0 md:pl-6 border-slate-100 md:border-l">
                <div className="text-sm font-bold text-slate-500 mb-2">{log.distance}</div>
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-4 w-4 ${i < log.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
