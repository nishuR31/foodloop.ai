'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, Search, Compass, AlertCircle, ChefHat, Truck, HeartHandshake } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const quickLinks = [
    { name: 'Kitchen Dashboard', href: '/dashboard/kitchen', icon: ChefHat, color: 'text-orange-500', bg: 'bg-orange-100' },
    { name: 'NGO Dashboard', href: '/dashboard/ngo', icon: HeartHandshake, color: 'text-emerald-500', bg: 'bg-emerald-100' },
    { name: 'Driver Dashboard', href: '/dashboard/driver', icon: Truck, color: 'text-blue-500', bg: 'bg-blue-100' },
    { name: 'Support / Donations', href: '/donations', icon: Compass, color: 'text-purple-500', bg: 'bg-purple-100' }
  ];

  const filteredLinks = quickLinks.filter(link => 
    link.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden selection:bg-indigo-200 selection:text-indigo-900">
      {/* Background Orbs */}
      <div className="absolute top-0 inset-x-0 h-screen overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-fuchsia-400/20 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center animate-fade-in-up">
        {/* Error Code & Graphic */}
        <div className="relative mb-8 group cursor-default">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl group-hover:bg-indigo-500/30 transition-colors duration-500" />
          <h1 className="text-[150px] font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-fuchsia-600 leading-none drop-shadow-sm select-none">
            404
          </h1>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-xl border border-white/50 group-hover:scale-110 transition-transform duration-500">
            <AlertCircle className="h-10 w-10 text-indigo-500" />
          </div>
        </div>

        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 text-center tracking-tight">
          Oops! You've gone off the menu.
        </h2>
        <p className="text-lg text-slate-600 text-center max-w-lg mb-10 font-medium leading-relaxed">
          The page you are looking for doesn't exist or has been moved. Let's get you back on track to saving food.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12 w-full max-w-sm">
          <button 
            onClick={() => router.back()}
            className="flex-1 bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-2xl shadow-sm font-bold hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group"
          >
            <ArrowLeft className="h-5 w-5 text-slate-400 group-hover:-translate-x-1 transition-transform" /> Go Back
          </button>
          <Link 
            href="/"
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-3 rounded-2xl shadow-xl shadow-indigo-500/30 font-bold hover:shadow-indigo-500/50 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Home className="h-5 w-5" /> Home
          </Link>
        </div>

        {/* Searchable Quick Links */}
        <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white shadow-xl shadow-slate-200/50">
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search for a dashboard or page..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 text-slate-900 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredLinks.length > 0 ? (
              filteredLinks.map((link, idx) => (
                <Link 
                  key={idx} 
                  href={link.href}
                  className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
                >
                  <div className={`p-3 rounded-xl ${link.bg} ${link.color} group-hover:scale-110 transition-transform`}>
                    <link.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{link.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{link.href}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-2 text-center py-6 text-slate-500 font-medium">
                No pages found matching "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
