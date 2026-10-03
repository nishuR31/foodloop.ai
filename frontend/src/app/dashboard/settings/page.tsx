'use client';

import { Settings, Trash2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { logout as reduxLogout } from '@/store/slices/authSlice';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const dispatch = useDispatch();

  const handleClearCache = async () => {
    toast('Clear Cache & Data', {
      description: 'Are you sure you want to clear all cache and local storage? You will be logged out.',
      action: {
        label: 'Yes, clear it',
        onClick: async () => {
          try {
            await api.post('/auth/logout');
          } catch (e) {}

          // Clear all local storage
          localStorage.clear();
          // Clear session storage
          sessionStorage.clear();
          
          // Clear all visible cookies
          document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
          });

          dispatch(reduxLogout());
          
          // Force a hard reload of the page to root
          window.location.href = '/';
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {}
      }
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10 animate-fade-in-up">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Settings className="h-8 w-8 text-slate-400" />
            Application Settings
          </h1>
          <p className="text-slate-500 mt-1">Manage your application preferences and troubleshoot issues.</p>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="p-2 bg-red-100 text-red-600 rounded-lg">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Troubleshooting</h3>
        </div>
        <div className="p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-red-50/50 border border-red-100">
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-900">Clear Application Cache</h4>
              <p className="text-sm text-slate-500 font-medium">
                If you are experiencing stale data, Rapid-Fire deployment mismatches, or corrupted state, 
                use this to hard reset your browser cache, local storage, and cookies. You will be signed out.
              </p>
            </div>
            <button
              onClick={handleClearCache}
              className="whitespace-nowrap bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-red-600/30 font-bold hover:shadow-red-600/50 hover:bg-red-700 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <Trash2 className="h-5 w-5" />
              Clear & Hard Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
