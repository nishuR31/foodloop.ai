'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSocket } from '@/components/SocketProvider';
import { useState, useEffect } from 'react';
import { PackageOpen, Plus, Search, Filter, Loader2, Sparkles, AlertTriangle, CheckCircle2, HeartHandshake, X } from 'lucide-react';
import { toast } from 'sonner';

export default function SmartInventory() {
  const { socket } = useSocket();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    productName: '',
    category: 'Cooked Meals',
    quantity: 10,
    unit: 'kg',
    storageLocation: 'Cold Storage A',
    expiryDays: 3,
  });

  const { data: invRes, isLoading, refetch } = useQuery({
    queryKey: ['smart-inventory'],
    queryFn: async () => {
      const res = await api.get('/inventory');
      return res.data;
    },
    refetchInterval: 5000,
  });

  const { data: sensorRes } = useQuery({
    queryKey: ['sensors-latest'],
    queryFn: async () => {
      const res = await api.get('/sensors/latest');
      return res.data;
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!socket) return;
    const handleInvUpdate = () => {
      refetch();
    };
    socket.on('inventory_updated', handleInvUpdate);
    socket.on('sensor:data', handleInvUpdate);
    return () => {
      socket.off('inventory_updated', handleInvUpdate);
      socket.off('sensor:data', handleInvUpdate);
    };
  }, [socket, refetch]);

  const items: any[] = invRes?.data || [];
  const latestSensor = sensorRes?.data;

  const filteredItems = items.filter((item) =>
    item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = items.length;
  const expiringSoonCount = items.filter((i) => i.status === 'EXPIRING_SOON' || i.status === 'QUALITY_WARNING').length;
  const safeCount = items.filter((i) => i.status === 'SAFE').length;

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName.trim()) {
      toast.error('Product name is required');
      return;
    }

    setSubmitting(true);
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + Number(formData.expiryDays));

      await api.post('/inventory', {
        productName: formData.productName,
        category: formData.category,
        quantity: Number(formData.quantity),
        unit: formData.unit,
        storageLocation: formData.storageLocation,
        expiryDate: expiryDate.toISOString(),
      });

      toast.success('Food item added to Smart Inventory');
      setShowAddModal(false);
      setFormData({
        productName: '',
        category: 'Cooked Meals',
        quantity: 10,
        unit: 'kg',
        storageLocation: 'Cold Storage A',
        expiryDays: 3,
      });
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDonateSurplus = async (item: any) => {
    try {
      await api.post('/production/consume-and-surplus', {
        foodItem: item.productName,
        quantityConsumed: 0,
        unit: item.unit,
      });
      toast.success(`Surplus food listed for NGO rescue: ${item.productName}!`);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to list surplus for NGOs');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <PackageOpen className="h-8 w-8 mr-3 text-emerald-500" />
            Smart Inventory & Spoilage Monitor
          </h1>
          <p className="text-slate-500 mt-2">Food stock dynamically protected by IoT sensor spoilage analysis.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Food Item
        </button>
      </div>

      {/* IoT Status Bar */}
      {latestSensor && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-700/60">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${
              latestSensor.status === 'SPOILED' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
              latestSensor.status === 'CAUTION' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}>
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-200">Storage Environment Monitor</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">{latestSensor.deviceId}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Temp: <b className="text-white">{Number(latestSensor.temperature).toFixed(1)}°C</b> · 
                Humidity: <b className="text-white">{Number(latestSensor.humidity).toFixed(1)}%</b> · 
                MQ-2 Gas: <b className="text-white">{latestSensor.mq2Raw}</b> · 
                MQ-3 VOC: <b className="text-white">{latestSensor.mq3Raw}</b>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400">Spoilage Risk</div>
              <div className="text-lg font-black text-white">{Number(latestSensor.spoilageScore).toFixed(1)}%</div>
            </div>
            <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
              latestSensor.status === 'SPOILED' ? 'bg-red-500 text-white' :
              latestSensor.status === 'CAUTION' ? 'bg-amber-500 text-white' :
              'bg-emerald-500 text-white'
            }`}>
              {latestSensor.status}
            </span>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50/80 rounded-2xl p-6 border border-blue-100 shadow-sm">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Total Stocked Items</p>
          <p className="text-4xl font-black text-blue-900">{totalItems}</p>
        </div>
        <div className="bg-emerald-50/80 rounded-2xl p-6 border border-emerald-100 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Optimal & Safe</p>
          <p className="text-4xl font-black text-emerald-900">{safeCount}</p>
        </div>
        <div className="bg-amber-50/80 rounded-2xl p-6 border border-amber-100 shadow-sm">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">At Risk / Caution</p>
          <p className="text-4xl font-black text-amber-900">{expiringSoonCount}</p>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search food by name or category..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all bg-white text-sm"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredItems.length} of {totalItems} items
          </span>
        </div>

        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-emerald-500" />
            <p className="font-medium animate-pulse">Syncing smart inventory data...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <PackageOpen className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-700">No inventory items found</p>
            <p className="text-xs text-slate-400 mt-1">Add food items or adjust your search filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4 font-bold">Item Name</th>
                  <th className="px-6 py-4 font-bold">Category</th>
                  <th className="px-6 py-4 font-bold">Quantity</th>
                  <th className="px-6 py-4 font-bold">Expiry Date</th>
                  <th className="px-6 py-4 font-bold">IoT Quality Status</th>
                  <th className="px-6 py-4 font-bold text-right">NGO Rescue Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item: any) => {
                  const isBad = item.status === 'EXPIRED' || item.status === 'QUALITY_WARNING';
                  const isCaution = item.status === 'EXPIRING_SOON';

                  const badgeColor = isBad
                    ? 'bg-red-100 text-red-700'
                    : isCaution
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{item.productName}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{item.category}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{item.quantity} {item.unit}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${badgeColor}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDonateSurplus(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                          title="Offer as surplus to local NGOs"
                        >
                          <HeartHandshake className="h-3.5 w-3.5" />
                          Route to NGOs
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900">Add Inventory Food Item</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Food Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Steamed Rice, Fresh Milk"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    <option value="Cooked Meals">Cooked Meals</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Grains">Grains</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Storage Location</label>
                  <input
                    type="text"
                    value={formData.storageLocation}
                    onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    <option value="kg">kg</option>
                    <option value="L">Liters</option>
                    <option value="meals">Meals</option>
                    <option value="items">Items</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Shelf Life (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formData.expiryDays}
                  onChange={(e) => setFormData({ ...formData, expiryDays: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
