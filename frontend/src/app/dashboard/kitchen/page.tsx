'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Activity, AlertTriangle, Package, Utensils, Zap, Plus, Camera, Loader2, CheckCircle2, Download, Map as MapIcon } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { useSocket } from '@/components/SocketProvider';
import * as XLSX from 'xlsx';
import dynamic from 'next/dynamic';

const RouteMap = dynamic(() => import('@/components/Map/RouteMap'), { ssr: false });

export default function KitchenDashboard() {
  const [showScanModal, setShowScanModal] = useState(false);
  const [showProdModal, setShowProdModal] = useState(false);
  const [showConsModal, setShowConsModal] = useState(false);

  // Scan state
  const [scanText, setScanText] = useState('');
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [qualityResult, setQualityResult] = useState<any>(null);

  // Form states
  const [prodForm, setProdForm] = useState({ foodItem: '', quantityProduced: 0, unit: 'kg' });
  const [consForm, setConsForm] = useState({ foodItem: '', quantityConsumed: 0, unit: 'kg' });

  // --- TanStack Query Data Fetching ---
  const { data: dashRes, isLoading: loadingDash, refetch: refetchDash } = useQuery({
    queryKey: ['kitchen-dashboard'],
    queryFn: async () => {
      const res = await api.get('/analytics/kitchen-dashboard');
      return res.data.data;
    },
    refetchInterval: 5000
  });

  const { data: invRes, isLoading: loadingInv, refetch: refetchInv } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await api.get('/inventory');
      return res.data.data;
    },
    refetchInterval: 5000
  });

  const { data: sensRes, isLoading: loadingSens } = useQuery({
    queryKey: ['sensors'],
    queryFn: async () => {
      const res = await api.get('/sensors');
      return res.data;
    },
    refetchInterval: 3000
  });

  const { data: directSensLatest } = useQuery({
    queryKey: ['sensors-latest-direct'],
    queryFn: async () => {
      const res = await api.get('/sensors/latest');
      return res.data?.data;
    },
    refetchInterval: 3000
  });

  const { data: recRes, isLoading: loadingRec } = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const res = await api.get('/ai/recommendations');
      return res.data.data;
    },
    refetchInterval: 10000
  });

  const { data: leadRes, isLoading: loadingLead } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const res = await api.get('/analytics/leaderboard');
      return res.data.data;
    },
    refetchInterval: 5000
  });

  const { data: delRes, isLoading: loadingDel } = useQuery({
    queryKey: ['kitchen-deliveries'],
    queryFn: async () => {
      const res = await api.get('/deliveries');
      return res.data.data.map((d: any) => ({
        id: d.id,
        status: d.status,
        surplus: d.redistribution.surplus,
        ngo: d.redistribution.ngo,
        routeOptimized: d.calculatedRoute
      }));
    },
    refetchInterval: 5000
  });

  const { socket } = useSocket();
  const [liveSensor, setLiveSensor] = useState<any>(null);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      refetchDash();
      refetchInv();
    };
    const handleSensorData = (sData: any) => {
      setLiveSensor(sData);
    };
    const handleSensorAlert = (alertData: any) => {
      if (alertData?.alerts) {
        alertData.alerts.forEach((a: any) => {
          if (a.severity === 'CRITICAL') {
            toast.error(a.title, { description: a.message });
          } else if (a.severity === 'WARNING') {
            toast.warning(a.title, { description: a.message });
          }
        });
      }
    };

    socket.on('surplus_updated', handleUpdate);
    socket.on('inventory_updated', handleUpdate);
    socket.on('sensor:data', handleSensorData);
    socket.on('sensor:alert', handleSensorAlert);
    return () => {
      socket.off('surplus_updated', handleUpdate);
      socket.off('inventory_updated', handleUpdate);
      socket.off('sensor:data', handleSensorData);
      socket.off('sensor:alert', handleSensorAlert);
    };
  }, [socket, refetchDash, refetchInv]);

  const data = dashRes ? { ...dashRes, leaderboard: leadRes } : null;
  const inventory = invRes || [];
  const sensors = sensRes?.data || [];
  const iotLatest = liveSensor || sensRes?.iotLatest || directSensLatest;
  const recommendations = recRes || [];
  const deliveries = delRes || [];

  const loading = loadingDash || loadingInv;

  const handleGenerateReport = () => {
    const wb = XLSX.utils.book_new();
    const invSheet = XLSX.utils.json_to_sheet(inventory.map((i: any) => ({
      Product: i.productName,
      Category: i.category,
      Quantity: `${i.quantity} ${i.unit}`,
      Status: i.status,
      ExpiryDate: i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : 'N/A'
    })));
    const surplusSheet = XLSX.utils.json_to_sheet((data?.activeSurpluses || []).map((s: any) => ({
      FoodItem: s.foodItem,
      Surplus: `${s.quantitySurplus} ${s.unit}`,
      Date: new Date(s.date).toLocaleDateString(),
      Status: s.status
    })));

    XLSX.utils.book_append_sheet(wb, invSheet, 'Inventory');
    XLSX.utils.book_append_sheet(wb, surplusSheet, 'Surpluses');
    XLSX.writeFile(wb, `Kitchen_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report generated successfully');
  };

  const handleScan = async () => {
    if (!scanImage) {
      toast.error('Please capture or upload an image');
      return;
    }
    setScanLoading(true);
    try {
      // Create a blob from the data url
      const resBlob = await fetch(scanImage);
      const blob = await resBlob.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'scan.jpg');
      
      const res = await api.post('/ai/ocr-extract', formData);
      setScanResult(res.data.data);
      setQualityResult(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error extracting data. Please try again.');
    } finally {
      setScanLoading(false);
    }
  };

  const handleAnalyzeQuality = async () => {
    if (!scanImage) {
      toast.error('Please capture or upload an image to analyze quality.');
      return;
    }
    setScanLoading(true);
    try {
      const [meta, imgData] = scanImage.split(',');
      const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
      const payload = { imageParts: [{ inlineData: { data: imgData, mimeType } }] };
      
      const res = await api.post('/ai/analyze-quality', payload);
      setQualityResult(res.data.data);
      setScanResult(null);
    } catch (err) {
      toast.error('Error analyzing quality. Please try again.');
    } finally {
      setScanLoading(false);
    }
  };

  const handleSaveInventory = async () => {
    if (!scanResult) return;
    
    // Quick validation
    if (scanResult.manufacturing_date && scanResult.expiry_date) {
      if (new Date(scanResult.manufacturing_date) > new Date(scanResult.expiry_date)) {
        toast.error("Manufacturing date cannot be after expiry date!");
        return;
      }
    }
    
    try {
      await api.post('/inventory', {
        productName: scanResult.product_name || 'Unknown',
        category: 'General', // Removed hardcoded Dairy
        quantity: 1, 
        unit: 'item',
        batchNumber: scanResult.batch_number,
        manufacturingDate: scanResult.manufacturing_date,
        expiryDate: scanResult.expiry_date
      });
      toast.success('Inventory saved successfully!');
      setShowScanModal(false);
      setScanResult(null);
      refetchInv();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save inventory');
    }
  };

  const handleRecordProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/production/record', {
        foodItem: prodForm.foodItem,
        quantityProduced: Number(prodForm.quantityProduced),
        unit: prodForm.unit
      });
      toast.success('Production recorded successfully!');
      setShowProdModal(false);
      setProdForm({ foodItem: '', quantityProduced: 0, unit: 'kg' });
      refetchDash();
    } catch (err) {
      toast.error('Failed to record production');
    }
  };

  const handleRecordConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/production/consume-and-surplus', {
        foodItem: consForm.foodItem,
        quantityConsumed: Number(consForm.quantityConsumed),
        unit: consForm.unit
      });
      toast.success('Consumption recorded and potential surplus created!');
      setShowConsModal(false);
      setConsForm({ foodItem: '', quantityConsumed: 0, unit: 'kg' });
      refetchDash();
    } catch (err) {
      toast.error('Failed to record consumption');
    }
  };

  if (loading) return <DashboardSkeleton />;

  const todayPrediction = data?.predictions?.[0] || { predictedDemand: '-', recommendedProduction: '-' };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 md:space-y-10 animate-fade-in-up">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Kitchen Operations</h1>
          <p className="text-slate-500 mt-1">Manage inventory, track production, and reduce waste.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleGenerateReport} className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl shadow-sm text-sm font-semibold hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
            <Download className="h-4 w-4 text-slate-500" /> Generate Report
          </button>
          <button onClick={() => setShowScanModal(true)} className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl shadow-sm text-sm font-semibold hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
            <Camera className="h-4 w-4 text-slate-500" /> AI Scan
          </button>
          <button onClick={() => setShowProdModal(true)} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 text-sm font-semibold hover:scale-105 hover:shadow-blue-500/40 transition-all duration-300 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Production
          </button>
          <button onClick={() => setShowConsModal(true)} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 text-sm font-semibold hover:scale-105 hover:shadow-emerald-500/40 transition-all duration-300 flex items-center gap-2">
            <Utensils className="h-4 w-4" /> Consumption
          </button>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'AI Demand Predict', value: todayPrediction.predictedDemand, sub: 'Meals expected today', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
          { title: 'Recommended', value: todayPrediction.recommendedProduction, sub: 'Meals to produce', icon: Utensils, color: 'text-blue-500', bg: 'bg-blue-50' },
          { title: 'Active Surplus', value: data?.activeSurpluses?.length || 0, sub: 'Awaiting pickup', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { title: 'Alerts', value: data?.activeAlerts?.length || 0, sub: 'Requires attention', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' }
        ].map((stat, i) => (
          <div key={i} className="group relative bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200/70 transition-all duration-300 overflow-hidden">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${stat.bg} opacity-50 group-hover:scale-150 transition-transform duration-500 -z-10`}></div>
            <div className={`flex items-center gap-3 ${stat.color} mb-3`}>
              <div className={`p-2 rounded-xl ${stat.bg}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-700 tracking-tight">{stat.title}</h3>
            </div>
            <p className="text-4xl font-extrabold text-slate-900 tracking-tight">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-2 font-medium">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="px-4 md:px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><Package className="h-4 w-4" /></div>
              Inventory (Expiring Soon)
            </h3>
          </div>
          <div className="divide-y divide-slate-50">
            {inventory.slice(0, 5).map((item: any) => (
              <div key={item.id} className="p-5 px-4 md:px-8 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                <div>
                  <p className="font-bold text-slate-900">{item.productName}</p>
                  <p className="text-sm font-medium text-slate-500 mt-1">Exp: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{item.quantity} {item.unit}</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold mt-1 ${item.status === 'SAFE' ? 'bg-emerald-100/80 text-emerald-700' : 'bg-red-100/80 text-red-700'}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
            {inventory.length === 0 && <div className="p-10 text-center text-slate-500 font-medium border border-dashed border-slate-200 m-6 rounded-2xl">No inventory found.</div>}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="px-4 md:px-8 py-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle2 className="h-4 w-4" /></div>
              Active Redistributions
            </h3>
          </div>
          <div className="divide-y divide-slate-50">
            {data?.activeSurpluses?.map((surplus: any) => (
              <div key={surplus.id} className="p-5 px-4 md:px-8 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                <div>
                  <p className="font-bold text-slate-900">{surplus.foodItem}</p>
                  <p className="text-sm font-medium text-slate-500 mt-1">{new Date(surplus.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{surplus.quantitySurplus} {surplus.unit}</p>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold mt-1 bg-amber-100/80 text-amber-700">
                    {surplus.status}
                  </span>
                </div>
              </div>
            ))}
            {data?.activeSurpluses?.length === 0 && <div className="p-10 text-center text-slate-500 font-medium border border-dashed border-slate-200 m-6 rounded-2xl">No active surplus.</div>}
          </div>
        </div>
      </div>

      {/* New Row: AI & IoT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="px-4 md:px-8 py-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><Zap className="h-4 w-4" /></div>
              AI Insights & Recommendations
            </h3>
          </div>
          <div className="divide-y divide-slate-50">
            {recommendations?.map((rec: any) => (
              <div key={rec.id} className="p-5 px-4 md:px-8 flex justify-between items-start hover:bg-slate-50/50 transition-colors">
                <div>
                  <p className="font-bold text-slate-900">{rec.title}</p>
                  <p className="text-sm font-medium text-slate-600 mt-1">{rec.description}</p>
                </div>
              </div>
            ))}
            {recommendations?.length === 0 && <div className="p-10 text-center text-slate-500 font-medium border border-dashed border-slate-200 m-6 rounded-2xl">No recommendations yet.</div>}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="px-4 md:px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Activity className="h-4 w-4" /></div>
              IoT Sensor Monitoring
            </h3>
            {iotLatest && (
              <span className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Node: {iotLatest.deviceId || 'ESP32_FOOD_001'}
              </span>
            )}
          </div>

          {/* Primary ESP32 Food Spoilage Node Card */}
          {iotLatest && (
            <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-b border-slate-700/50">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-md border border-emerald-800/60">
                      Live Hardware Node
                    </span>
                    <h4 className="font-bold text-base text-white">Food Freshness & Spoilage Monitor</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Multi-sensor food safety matrix (DHT22 + MQ-2 + MQ-3)</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Spoilage Score</div>
                    <div className="text-2xl font-black text-white">{Number(iotLatest.spoilageScore ?? 0).toFixed(1)}<span className="text-xs font-normal text-slate-400"> / 100</span></div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wider uppercase shadow-md ${
                    iotLatest.status === 'SPOILED' ? 'bg-red-500 text-white' :
                    iotLatest.status === 'CAUTION' ? 'bg-amber-500 text-white' :
                    'bg-emerald-500 text-white'
                  }`}>
                    {iotLatest.status || 'GOOD'}
                  </span>
                </div>
              </div>

              {/* 4 Sensor metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-slate-800/70 p-3 rounded-2xl border border-slate-700/60">
                  <div className="text-[11px] text-slate-400 font-medium">Temperature</div>
                  <div className="text-lg font-bold text-white mt-0.5">{Number(iotLatest.temperature ?? 0).toFixed(1)}°C</div>
                  <div className="text-[10px] text-slate-500">DHT22 Digital</div>
                </div>
                <div className="bg-slate-800/70 p-3 rounded-2xl border border-slate-700/60">
                  <div className="text-[11px] text-slate-400 font-medium">Humidity</div>
                  <div className="text-lg font-bold text-white mt-0.5">{Number(iotLatest.humidity ?? 0).toFixed(1)}%</div>
                  <div className="text-[10px] text-slate-500">DHT22 Digital</div>
                </div>
                <div className="bg-slate-800/70 p-3 rounded-2xl border border-slate-700/60">
                  <div className="text-[11px] text-slate-400 font-medium">Gas / Smoke</div>
                  <div className="text-lg font-bold text-white mt-0.5">{iotLatest.mq2Raw ?? '--'}</div>
                  <div className="text-[10px] text-slate-500">MQ-2 Raw ADC</div>
                </div>
                <div className="bg-slate-800/70 p-3 rounded-2xl border border-slate-700/60">
                  <div className="text-[11px] text-slate-400 font-medium">VOC / Alcohol</div>
                  <div className="text-lg font-bold text-white mt-0.5">{iotLatest.mq3Raw ?? '--'}</div>
                  <div className="text-[10px] text-slate-500">MQ-3 Fermentation</div>
                </div>
              </div>
            </div>
          )}

          <div className="divide-y divide-slate-50">
            {sensors?.map((sensor: any) => {
              const latestReading = sensor.readings?.[0];
              const isAlert = latestReading?.isAlertTriggered;
              return (
                <div key={sensor.id} className="p-5 px-4 md:px-8 flex flex-wrap justify-between items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900">{sensor.name} <span className="text-xs text-slate-400 font-medium ml-2">({sensor.location})</span></p>
                    <p className="text-sm font-medium text-slate-500 mt-1">Status: {sensor.status}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-extrabold text-xl ${isAlert ? 'text-red-600' : 'text-emerald-600'}`}>
                      {latestReading ? `${latestReading.value}${sensor.type === 'TEMPERATURE' ? '°C' : '%'}` : 'N/A'}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold mt-1 ${isAlert ? 'bg-red-100/80 text-red-700' : 'bg-emerald-100/80 text-emerald-700'}`}>
                      {isAlert ? 'CRITICAL' : 'NORMAL'}
                    </span>
                  </div>
                </div>
              );
            })}
            {sensors?.length === 0 && <div className="p-10 text-center text-slate-500 font-medium border border-dashed border-slate-200 m-6 rounded-2xl">No sensors active.</div>}
          </div>
        </div>
      </div>

      {/* Live Route Map for Kitchen Deliveries */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 p-4 md:p-6 mb-8">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4 flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-indigo-500" /> Live Delivery Tracking
        </h3>
        <RouteMap tasks={deliveries} />
      </div>

      {/* Global Impact Leaderboard */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-indigo-500/30">
        <div className="px-4 md:px-8 py-6 border-b border-white/10 bg-black/20 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
            <span className="text-2xl">🏆</span> Global Impact Leaderboard
          </h3>
          <span className="text-indigo-200 text-sm font-medium">Top Kitchens saving the most food</span>
        </div>
        <div className="p-4 md:p-8">
          {data?.leaderboard?.kitchens?.length > 0 ? (
            <div className="space-y-4">
              {data.leaderboard.kitchens.map((k: any, idx: number) => (
                <div key={k.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 rounded-2xl p-4 md:p-5 hover:bg-white/10 transition-colors border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-inner ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-amber-600 text-amber-50' : 'bg-indigo-900/50 text-indigo-200'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">{k.name}</p>
                      <p className="text-sm font-medium text-indigo-300">Total Surplus Generated</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{k.score}</p>
                    <p className="text-xs font-bold text-emerald-500/80 uppercase tracking-widest mt-1">Units Saved</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-10 text-indigo-300/60 font-medium">No leaderboard data available yet.</div>
          )}
        </div>
      </div>

      {/* Scan Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-6 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Camera className="h-5 w-5" /></div>
              AI Product Scan
            </h2>
            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <label className="block text-sm font-bold text-slate-700">Upload Image or Capture</label>
                <div className="relative border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl p-6 text-center transition-colors group">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={scanLoading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setScanImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {scanImage ? (
                    <div className="relative z-0 overflow-hidden rounded-lg inline-block">
                      <img src={scanImage} alt="Preview" className="mx-auto max-h-36 rounded-lg shadow-md border border-indigo-200 block" />
                      {scanLoading && (
                        <div className="absolute inset-0 z-20 pointer-events-none">
                          <div className="w-full h-0.5 bg-indigo-500 shadow-[0_0_8px_2px_rgba(99,102,241,0.8)] animate-[scan_1.5s_ease-in-out_infinite_alternate]" style={{ animation: 'scan 1.5s ease-in-out infinite alternate' }}></div>
                          <style>{`
                            @keyframes scan {
                              0% { transform: translateY(0); }
                              100% { transform: translateY(144px); }
                            }
                          `}</style>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-indigo-500 flex flex-col items-center group-hover:scale-105 transition-transform">
                      <Camera className="h-10 w-10 mb-3 opacity-80" />
                      <span className="text-sm font-bold">Tap to snap or upload an image</span>
                      <span className="text-xs font-medium text-indigo-400 mt-1">JPEG, PNG supported</span>
                    </div>
                  )}
                </div>
                {scanImage && (
                  <button onClick={() => setScanImage(null)} className="text-xs text-red-500 font-bold hover:underline self-end">
                    Remove Image
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Or provide text manually</label>
                <textarea 
                  className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none placeholder:text-indigo-400/80 placeholder:font-semibold placeholder:italic bg-indigo-50/10" 
                  rows={2} 
                  placeholder="e.g. Milk 1 Gallon MFG 2026-09-02 EXP 2026-09-15 Batch M24091"
                  value={scanText} 
                  onChange={e => setScanText(e.target.value)} 
                />
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={handleScan} 
                  disabled={scanLoading}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {scanLoading && !scanResult && !qualityResult ? <Loader2 className="animate-spin h-5 w-5" /> : 'OCR Extract'}
                </button>
                <button 
                  onClick={handleAnalyzeQuality} 
                  disabled={scanLoading || !scanImage}
                  className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {scanLoading && (!scanResult && !qualityResult) ? <Loader2 className="animate-spin h-5 w-5" /> : 'Analyze Quality'}
                </button>
              </div>

              {scanResult && (
                <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-3 animate-fade-in-up">
                  <p><strong className="text-slate-900">Product:</strong> <span className="text-slate-600">{scanResult.product_name}</span></p>
                  <p><strong className="text-slate-900">MFG:</strong> <span className="text-slate-600">{scanResult.manufacturing_date}</span></p>
                  <p><strong className="text-slate-900">EXP:</strong> <span className="text-slate-600">{scanResult.expiry_date}</span></p>
                  <p><strong className="text-slate-900">Batch:</strong> <span className="text-slate-600">{scanResult.batch_number}</span></p>
                  <button onClick={handleSaveInventory} className="w-full bg-emerald-600 text-white py-3 rounded-xl mt-4 font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all hover:-translate-y-0.5">
                    Confirm & Save to Inventory
                  </button>
                </div>
              )}

              {qualityResult && (
                <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-3 animate-fade-in-up">
                  <div className="flex items-center justify-between mb-2">
                    <strong className="text-slate-900 text-base">Quality Status</strong>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold mt-1 ${qualityResult.quality_status === 'SAFE' ? 'bg-emerald-100/80 text-emerald-700' : 'bg-red-100/80 text-red-700'}`}>
                      {qualityResult.quality_status}
                    </span>
                  </div>
                  <p><strong className="text-slate-900">Confidence:</strong> <span className="text-slate-600">{(qualityResult.confidence * 100).toFixed(0)}%</span></p>
                  <p><strong className="text-slate-900">Issues detected:</strong></p>
                  <ul className="list-disc pl-5 text-slate-600 space-y-1">
                    {qualityResult.visible_issues?.map((issue: string, idx: number) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                  <p className="mt-3 bg-amber-50 p-3 rounded-lg border border-amber-100"><strong className="text-amber-800">Recommendation:</strong> <span className="text-amber-700">{qualityResult.recommendation}</span></p>
                </div>
              )}
            </div>
            <div className="mt-8 flex justify-end">
              <button onClick={() => setShowScanModal(false)} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Production Modal */}
      {showProdModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-6 flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Plus className="h-5 w-5" /></div>
              Record Production
            </h2>
            <form onSubmit={handleRecordProduction} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Food Item</label>
                <input type="text" required className="w-full border-2 border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" value={prodForm.foodItem} onChange={e => setProdForm({...prodForm, foodItem: e.target.value})} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Quantity</label>
                  <input type="number" required min="1" className="w-full border-2 border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" value={prodForm.quantityProduced} onChange={e => setProdForm({...prodForm, quantityProduced: e.target.value as any})} />
                </div>
                <div className="w-28">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Unit</label>
                  <select className="w-full border-2 border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none bg-white" value={prodForm.unit} onChange={e => setProdForm({...prodForm, unit: e.target.value})}>
                    <option value="kg">kg</option>
                    <option value="meals">meals</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-8">
                <button type="button" onClick={() => setShowProdModal(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
                <button type="submit" className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all hover:-translate-y-0.5">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consumption Modal */}
      {showConsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><Utensils className="h-5 w-5" /></div>
              Record Consumption
            </h2>
            <p className="text-sm font-medium text-slate-500 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">Recording less consumption than production will automatically generate a surplus listing.</p>
            <form onSubmit={handleRecordConsumption} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Food Item</label>
                <input type="text" required className="w-full border-2 border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" value={consForm.foodItem} onChange={e => setConsForm({...consForm, foodItem: e.target.value})} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Quantity Consumed</label>
                  <input type="number" required min="0" className="w-full border-2 border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" value={consForm.quantityConsumed} onChange={e => setConsForm({...consForm, quantityConsumed: e.target.value as any})} />
                </div>
                <div className="w-28">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Unit</label>
                  <select className="w-full border-2 border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none bg-white" value={consForm.unit} onChange={e => setConsForm({...consForm, unit: e.target.value})}>
                    <option value="kg">kg</option>
                    <option value="meals">meals</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-8">
                <button type="button" onClick={() => setShowConsModal(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
                <button type="submit" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all hover:-translate-y-0.5">Save & Calculate</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
