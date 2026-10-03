'use client';

import { Users, Plus, Search, Filter, ShieldAlert, Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function OrganizationsDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
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

  const handleAction = () => {
    toast.info('Organization management features are restricted in MVP demo mode.');
  };

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Users className="h-8 w-8 mr-3 text-purple-500" />
            Organizations Directory
          </h1>
          <p className="text-slate-500 mt-2">Manage all Kitchens and NGOs in the FoodLoop network.</p>
        </div>
        <button 
          onClick={handleAction}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center transition-all shadow-lg shadow-purple-500/20"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Organization
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search organizations..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border-slate-200 focus:border-purple-500 focus:ring-purple-500 transition-all shadow-sm bg-white"
            />
          </div>
          <button className="flex items-center px-6 py-3 font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </button>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-bold">Organization Name</th>
              <th className="px-6 py-4 font-bold">Type</th>
              <th className="px-6 py-4 font-bold">Location</th>
              <th className="px-6 py-4 font-bold">Status</th>
              <th className="px-6 py-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrgs.map((org) => (
              <tr key={org.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-3 ${org.type === 'KITCHEN' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-slate-900">{org.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                    org.type === 'KITCHEN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
                  }`}>
                    {org.type}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-600">{org.location || 'Unknown'}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className={`h-2 w-2 rounded-full mr-2 ${org.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    <span className="text-sm font-semibold text-slate-700">{org.status || 'Active'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={handleAction} className="text-purple-600 font-bold text-sm hover:underline">
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredOrgs.length === 0 && (
          <div className="p-10 text-center text-slate-500 font-medium font-mono text-sm border-t border-slate-100">
            No organizations found.
          </div>
        )}
      </div>
    </div>
  );
}
