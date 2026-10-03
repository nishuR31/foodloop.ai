'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Leaf, LogOut, LayoutDashboard, Settings, PackageOpen,
  LineChart, ShoppingCart, Truck, History, Users, Database, ShieldAlert,
  Activity, Map as MapIcon, Cpu, Heart, Camera, Bell, Menu, X
} from 'lucide-react';
import { api } from '@/lib/api';
import { NotificationBell } from '@/components/NotificationBell';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUser, logout as reduxLogout } from '@/store/slices/authSlice';
import { RootState, AppDispatch } from '@/store/store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch<AppDispatch>();
  const { user, status } = useSelector((state: RootState) => state.auth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user && status === 'idle') {
      dispatch(fetchUser());
    } else if (status === 'failed') {
      router.push('/login');
    }
  }, [user, status, dispatch, router]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) { }
    dispatch(reduxLogout());
    router.push('/');
  };

  const getNavLinks = (role: string) => {
    const base = `/dashboard/${role.split('_')[0].toLowerCase()}`;
    switch (role) {
      case 'KITCHEN_MANAGER':
        return [
          { name: 'Dashboard', href: base, icon: LayoutDashboard },
          { name: 'Smart Inventory', href: `${base}/inventory`, icon: PackageOpen },
          { name: 'Production & Analytics', href: `${base}/production`, icon: LineChart },
          { name: 'AI Quality Scans', href: `${base}/scans`, icon: Camera },
          { name: 'IoT Alerts', href: `${base}/alerts`, icon: Bell },
        ];
      case 'NGO_STAFF':
        return [
          { name: 'Dashboard', href: base, icon: LayoutDashboard },
          { name: 'Surplus Marketplace', href: `${base}/marketplace`, icon: ShoppingCart },
          { name: 'Incoming Deliveries', href: `${base}/incoming`, icon: Truck },
          { name: 'Impact Reports', href: `${base}/impact`, icon: Heart },
          { name: 'Volunteer Hub', href: `${base}/volunteers`, icon: Users },
        ];
      case 'DRIVER':
        return [
          { name: 'Active Route', href: base, icon: Truck },
          { name: 'Delivery History', href: `${base}/history`, icon: History },
          { name: 'Vehicle Diagnostics', href: `${base}/diagnostics`, icon: Activity },
        ];
      case 'ADMIN':
        return [
          { name: 'Network Overview', href: base, icon: LayoutDashboard },
          { name: 'Organizations', href: `${base}/organizations`, icon: Users },
          { name: 'Audit Trail', href: `${base}/audit`, icon: Database },
          { name: 'AI Command Center', href: `${base}/ai-command`, icon: Cpu },
          { name: 'Global Logistics', href: `${base}/logistics`, icon: MapIcon },
          { name: 'System Health', href: `${base}/health`, icon: Activity },
        ];
      default:
        return [{ name: 'Dashboard', href: base, icon: LayoutDashboard }];
    }
  };

  const navLinks = user ? getNavLinks(user.role) : [];

  if (status === 'loading' || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse flex flex-col items-center">
        <Leaf className="text-emerald-500 h-14 w-14 mb-6 animate-bounce drop-shadow-lg" />
        <div className="text-emerald-600 font-bold tracking-widest uppercase text-sm">Authenticating...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50/50">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-72 bg-white/95 backdrop-blur-xl md:bg-white/80 border-r border-slate-100 flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 overflow-hidden">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-2 rounded-xl shadow-lg shadow-emerald-500/30 mr-3 flex-shrink-0">
              <Leaf className="text-white h-5 w-5" />
            </div>
            <span className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight flex items-baseline gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis">FoodLoop AI</span>
          </div>
          <button className="md:hidden p-2 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 py-8 px-6 space-y-2">
          <div className="px-3 mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Menu</div>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100/50'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
              >
                <link.icon className={`h-5 w-5 mr-3 transition-transform ${isActive ? 'text-emerald-600 group-hover:scale-110' : 'text-slate-400 group-hover:-rotate-12'
                  }`} />
                {link.name}
              </Link>
            )
          })}
          <div className="my-4 border-t border-slate-100"></div>
          <Link href="/dashboard/settings" className="text-slate-500 hover:bg-slate-50 hover:text-slate-900 flex items-center px-4 py-3 text-sm font-bold rounded-xl w-full text-left transition-all duration-200 group border border-transparent">
            <Settings className="h-5 w-5 mr-3 text-slate-400 group-hover:rotate-45 transition-transform" />
            Settings
          </Link>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/30">
          <div className="flex items-center p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 flex-1 overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs font-semibold text-slate-500 truncate tracking-wide">{user.role.replace('_', ' ')}</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors group">
              <LogOut className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="md:hidden h-16 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-4 sticky top-0 z-20">
          <div className="flex items-center">
            <button className="mr-3 p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-1.5 rounded-lg shadow-sm mr-2">
              <Leaf className="text-white h-5 w-5" />
            </div>
            <span className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight flex items-baseline gap-1">FoodLoop AI</span>
          </div>
          <div className="flex items-center space-x-2">
            <NotificationBell />
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
