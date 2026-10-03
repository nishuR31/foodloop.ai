'use client';

import { Users, UserPlus, MapPin, Star } from 'lucide-react';

export default function VolunteerHub() {
  const volunteers = [
    { id: 1, name: 'Sarah Jenkins', role: 'Driver', status: 'Online', rating: 4.9, distance: '2.1 km' },
    { id: 2, name: 'Michael Chang', role: 'Driver', status: 'In Transit', rating: 4.8, distance: '5.4 km' },
    { id: 3, name: 'Priya Patel', role: 'Warehouse', status: 'Offline', rating: 5.0, distance: '0.0 km' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Volunteer Hub</h1>
          <p className="text-slate-500 mt-2 text-lg">Manage your NGO's volunteer drivers and warehouse staff.</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200 flex items-center">
          <UserPlus className="w-5 h-5 mr-2" />
          Invite Volunteer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {volunteers.map((vol) => (
          <div key={vol.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 mb-4 flex items-center justify-center text-2xl font-bold text-slate-400 relative">
              {vol.name.charAt(0)}
              <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-4 border-white ${vol.status === 'Online' ? 'bg-emerald-500' : vol.status === 'In Transit' ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
            </div>
            <h3 className="font-bold text-slate-900 text-lg">{vol.name}</h3>
            <p className="text-slate-500 text-sm mb-4">{vol.role} • {vol.status}</p>
            
            <div className="flex w-full justify-between items-center border-t border-slate-100 pt-4 mt-2">
              <div className="flex items-center text-amber-500 font-bold">
                <Star className="w-4 h-4 mr-1 fill-current" />
                {vol.rating}
              </div>
              <div className="flex items-center text-slate-400 text-sm">
                <MapPin className="w-4 h-4 mr-1" />
                {vol.distance}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
