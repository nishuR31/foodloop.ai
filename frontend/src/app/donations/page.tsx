import Link from 'next/link';
import { Heart, CreditCard, Leaf, ArrowRight } from 'lucide-react';

export default function DonationsPage() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-1.5 rounded-lg shadow-sm">
                <Leaf className="text-white h-5 w-5" />
              </div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">FoodLoop</span>
            </Link>
            <Link href="/login" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-[1000px] h-[1000px] rounded-full bg-emerald-50/50 blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-teal-50/50 blur-3xl" />
        </div>
        
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100/50 text-emerald-700 font-bold text-sm mb-8 border border-emerald-200/50">
            <Heart className="h-4 w-4" /> Support Our Mission
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8">
            Turn surplus into <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">smiles.</span>
          </h1>
          <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto mb-12">
            Your donation helps us maintain our logistics network, develop new AI-driven redistribution routes, and ensure that perfectly good food reaches those who need it most instead of landfills.
          </p>
        </div>
      </div>

      {/* Donation Options */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Option 1 */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-200/70 transition-all duration-300 flex flex-col">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
              <span className="text-2xl font-bold text-blue-600">$10</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Fuel a Driver</h3>
            <p className="text-slate-500 font-medium mb-8 flex-1">
              Covers the logistics cost for one of our volunteer drivers to pick up and deliver a surplus payload to a local NGO.
            </p>
            <button className="w-full py-4 rounded-xl font-bold bg-slate-50 text-slate-900 hover:bg-slate-100 transition-colors">
              Donate $10
            </button>
          </div>

          {/* Option 2 (Featured) */}
          <div className="bg-gradient-to-b from-emerald-500 to-teal-600 rounded-3xl p-8 border border-emerald-400 shadow-2xl shadow-emerald-500/30 hover:-translate-y-2 hover:shadow-emerald-500/50 transition-all duration-300 flex flex-col relative transform md:-translate-y-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-white text-emerald-600 font-bold text-sm rounded-full shadow-md">
              Most Popular
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 text-white border border-white/30">
              <span className="text-2xl font-bold">$50</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Feed a Community</h3>
            <p className="text-emerald-50 font-medium mb-8 flex-1">
              Funds the logistics and storage required to rescue an entire week's worth of surplus from a commercial kitchen.
            </p>
            <button className="w-full py-4 rounded-xl font-bold bg-white text-emerald-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
              <CreditCard className="h-5 w-5" /> Donate $50
            </button>
          </div>

          {/* Option 3 */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-200/70 transition-all duration-300 flex flex-col">
            <div className="h-14 w-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-6">
              <span className="text-2xl font-bold text-purple-600">Custom</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Corporate Giving</h3>
            <p className="text-slate-500 font-medium mb-8 flex-1">
              Enter a custom amount. Large donations help us expand our AI infrastructure to match donations faster and more accurately.
            </p>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input type="number" placeholder="0.00" className="w-full pl-8 py-3.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none font-bold text-slate-900 bg-slate-50" />
              </div>
            </div>
            <button className="w-full py-4 rounded-xl font-bold bg-slate-900 text-white shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
              Donate Custom <ArrowRight className="h-4 w-4" />
            </button>
          </div>

        </div>
      </div>
      
    </div>
  );
}
