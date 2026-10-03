'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Error Boundary caught an error:', error);
  }, [error]);

  const handleHardReset = () => {
    // Clear all local storage
    localStorage.clear();
    // Clear session storage
    sessionStorage.clear();
    
    // Clear all visible cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Force a hard reload of the page
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full text-center space-y-6">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Something went wrong!</h2>
        <p className="text-slate-500 font-medium text-sm">
          A critical error occurred in the application. You can try recovering the page or perform a hard reset if the issue persists (useful if you're seeing stale production builds).
        </p>
        <div className="p-4 bg-slate-50 rounded-xl text-left border border-slate-100 overflow-auto max-h-32">
          <code className="text-xs text-slate-600 font-mono">{error.message}</code>
        </div>
        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={() => reset()}
            className="w-full bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:shadow-slate-900/40 hover:-translate-y-0.5 transition-all"
          >
            Try Again
          </button>
          <button
            onClick={handleHardReset}
            className="w-full bg-red-50 text-red-600 px-6 py-3 rounded-xl font-bold border border-red-100 hover:bg-red-100 transition-colors"
          >
            Clear Cache & Hard Reset
          </button>
        </div>
      </div>
    </div>
  );
}
