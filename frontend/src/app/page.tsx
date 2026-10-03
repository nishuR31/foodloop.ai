import Link from 'next/link';
import {
  Leaf,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  Clock,
  MapPin,
  Zap,
  Globe,
  Cpu,
  Scan,
  Radio,
  Activity,
  CheckCircle2,
  BarChart3,
  Layers,
  Truck,
  Utensils
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 overflow-hidden relative selection:bg-emerald-200 selection:text-emerald-900 font-sans">
      {/* Background Decorative Clay Orbs */}
      <div className="absolute top-0 inset-x-0 h-screen overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full bg-emerald-300/30 blur-[130px] animate-pulse" />
        <div className="absolute top-[25%] -right-[12%] w-[45%] h-[45%] rounded-full bg-indigo-400/25 blur-[140px]" />
        <div className="absolute bottom-[10%] left-[15%] w-[50%] h-[50%] rounded-full bg-teal-300/20 blur-[150px]" />
      </div>

      {/* Floating Clay Navbar */}
      <header className="fixed top-4 inset-x-0 mx-auto max-w-6xl px-4 z-50">
        <div className="clay-card px-6 py-3.5 flex items-center justify-between bg-white/90 backdrop-blur-md">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="p-3 clay-emerald rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Leaf className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-slate-900 block leading-none">
                FoodLoop <span className="text-emerald-600">AI</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Zero-Waste Platform</span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-6 text-sm font-bold text-slate-600">
            <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-emerald-600 transition-colors">How It Works</a>
            <a href="#live-demo" className="hover:text-emerald-600 transition-colors">Live Preview</a>
            <a href="#architecture" className="hover:text-emerald-600 transition-colors">Tech Stack</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 text-sm font-extrabold text-slate-700 hover:text-indigo-600 transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-6 py-2.5 text-sm font-black clay-emerald text-white flex items-center gap-2 active:scale-95 transition-transform"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center text-center px-6 pt-36 pb-20 lg:pt-44 lg:pb-28 relative z-10">
        <div className="animate-fade-in-up flex flex-col items-center max-w-5xl">


          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 max-w-5xl mb-8 leading-[1.08]">
            Smart Food Waste Reduction & <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600">
              Real-Time Redistribution
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mb-10 leading-relaxed font-semibold">
            Eliminate kitchen surplus with real-time Socket.io updates, standalone Python PaddleOCR inventory parsing, and AI demand prediction algorithms.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-5 mb-16 w-full sm:w-auto">
            <Link
              href="/login"
              className="px-10 py-4.5 text-lg font-black clay-indigo text-white flex items-center justify-center gap-3 active:scale-95 transition-all cursor-pointer shadow-xl"
            >
              <span>Launch Interactive Platform</span>
              <div className="bg-white/20 rounded-full p-1.5 shadow-inner">
                <ArrowRight className="h-5 w-5" />
              </div>
            </Link>
            <a
              href="http://localhost:3001/docs"
              target="_blank"
              rel="noreferrer"
              className="px-9 py-4.5 text-lg font-black clay-button bg-white text-slate-800 hover:bg-slate-50 flex items-center justify-center gap-2.5 cursor-pointer border border-slate-200"
            >
              <Globe className="h-5 w-5 text-indigo-500" />
              <span>Swagger OpenAPI Specs</span>
            </a>
          </div>

          {/* Floating Clay Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
            <div className="clay-card p-5 text-center">
              <div className="text-3xl font-black text-emerald-600 mb-1">99.4%</div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">AI Demand Accuracy</div>
            </div>
            <div className="clay-card p-5 text-center">
              <div className="text-3xl font-black text-indigo-600 mb-1">&lt; 50ms</div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Socket.io Event Sync</div>
            </div>
            <div className="clay-card p-5 text-center">
              <div className="text-3xl font-black text-purple-600 mb-1">0.4 sec</div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">PaddleOCR Scan Speed</div>
            </div>
            <div className="clay-card p-5 text-center">
              <div className="text-3xl font-black text-teal-600 mb-1">1.2M+ lbs</div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Surplus Food Saved</div>
            </div>
          </div>
        </div>

        {/* Live Clay Micro-Dashboard Preview Mockup */}
        <section id="live-demo" className="w-full max-w-6xl mt-24 text-left">
          <div className="clay-card p-6 md:p-10 bg-slate-50/80">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 mb-8 border-b border-slate-200/80 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600">Socket.io Live Feed Active</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Real-Time Operations Monitor</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="clay-pill px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-extrabold flex items-center gap-1.5 border border-indigo-100">
                  <Cpu className="w-4 h-4 text-indigo-500" />
                  <span>AI Engine v2.4</span>
                </div>
                <div className="clay-pill px-4 py-2 bg-purple-50 text-purple-700 text-xs font-extrabold flex items-center gap-1.5 border border-purple-100">
                  <Scan className="w-4 h-4 text-purple-500" />
                  <span>Python OCR Active</span>
                </div>
              </div>
            </div>

            {/* Micro Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Item 1: Real-time Surplus Notification */}
              <div className="clay-card p-5 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-sm">
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>Socket Broadcast</span>
                  </div>
                  <span className="text-xs text-slate-400 font-bold">Just Now</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-lg">Fresh Vegetable Soup</h4>
                  <p className="text-xs font-bold text-slate-500">45 Portions • Central Kitchen</p>
                </div>
                <div className="clay-pill px-3 py-1.5 bg-emerald-100/70 text-emerald-800 text-xs font-extrabold inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Matched to Hope Shelter NGO</span>
                </div>
              </div>

              {/* Item 2: AI Demand Predictor */}
              <div className="clay-card p-5 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm">
                    <TrendingDown className="w-4 h-4" />
                    <span>AI Surplus Forecast</span>
                  </div>
                  <span className="text-xs text-emerald-600 font-bold">-34% Risk</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-lg">Optimized Prep Schedule</h4>
                  <p className="text-xs font-bold text-slate-500 font-mono">Predicted Demand: 180 Meals</p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 p-0.5 shadow-inner">
                  <div className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full rounded-full w-[78%] transition-all duration-1000" />
                </div>
              </div>

              {/* Item 3: OCR Instant Scan */}
              <div className="clay-card p-5 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-600 font-extrabold text-sm">
                    <Scan className="w-4 h-4" />
                    <span>PaddleOCR Scanner</span>
                  </div>
                  <span className="text-xs text-purple-600 font-bold font-mono">99.8% Conf.</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-lg">Organic Milk Bulk Batch</h4>
                  <p className="text-xs font-bold text-slate-500">Parsed Expiry: Sept 22, 2026</p>
                </div>
                <div className="clay-pill px-3 py-1.5 bg-purple-100/70 text-purple-800 text-xs font-extrabold inline-flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-600" />
                  <span>Auto-Synced to Inventory</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features Grid */}
        <section id="features" className="w-full max-w-6xl mt-28 text-left">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
              Engineered for Complete Food Lifecycle Efficiency
            </h2>
            <p className="text-lg font-semibold text-slate-600 max-w-2xl mx-auto">
              Our 3-pillar platform addresses food waste at every stage: production, inventory, and redistribution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="clay-card p-8 group hover:scale-[1.02] transition-transform">
              <div className="h-16 w-16 clay-indigo text-white flex items-center justify-center mb-8 shadow-xl">
                <TrendingDown className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Demand Prediction AI</h3>
              <p className="text-slate-600 leading-relaxed font-semibold">
                Historical order analytics, seasonality trends, and weather patterns feed machine learning models to forecast exact batch quantities.
              </p>
            </div>

            <div className="clay-card p-8 group hover:scale-[1.02] transition-transform">
              <div className="h-16 w-16 clay-purple text-white flex items-center justify-center mb-8 shadow-xl">
                <Scan className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Standalone Python OCR</h3>
              <p className="text-slate-600 leading-relaxed font-semibold">
                Snap food labels to instantly extract item names, batch IDs, and expiration dates via high-accuracy PaddleOCR service.
              </p>
            </div>

            <div className="clay-card p-8 group hover:scale-[1.02] transition-transform">
              <div className="h-16 w-16 clay-emerald text-white flex items-center justify-center mb-8 shadow-xl">
                <Radio className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Socket.io Dispatch</h3>
              <p className="text-slate-600 leading-relaxed font-semibold">
                Instant WebSocket broadcast matches unserviced surplus with nearby accredited NGOs and dispatches delivery drivers in real time.
              </p>
            </div>
          </div>
        </section>

        {/* 4-Step How It Works Workflow */}
        <section id="workflow" className="w-full max-w-6xl mt-28 text-left">
          <div className="text-center mb-16">
            <div className="clay-pill px-5 py-2 bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-widest inline-block mb-4">
              Seamless Workflow
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">
              How FoodLoop AI Operates in 4 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="clay-card p-6 flex flex-col items-start relative">
              <div className="w-12 h-12 clay-emerald text-white rounded-2xl flex items-center justify-center font-black text-xl mb-5 shadow-lg">
                1
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg mb-2">Cook & Scan</h4>
              <p className="text-slate-600 text-sm font-semibold leading-relaxed">
                Kitchen staff log prepared items using image OCR scanning for instantaneous expiration tagging.
              </p>
            </div>

            <div className="clay-card p-6 flex flex-col items-start relative">
              <div className="w-12 h-12 clay-indigo text-white rounded-2xl flex items-center justify-center font-black text-xl mb-5 shadow-lg">
                2
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg mb-2">Predict Demand</h4>
              <p className="text-slate-600 text-sm font-semibold leading-relaxed">
                AI algorithms calculate meal consumption forecasts to adjust ongoing batch preparation.
              </p>
            </div>

            <div className="clay-card p-6 flex flex-col items-start relative">
              <div className="w-12 h-12 clay-purple text-white rounded-2xl flex items-center justify-center font-black text-xl mb-5 shadow-lg">
                3
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg mb-2">Broadcast Surplus</h4>
              <p className="text-slate-600 text-sm font-semibold leading-relaxed">
                Excess unserved meals trigger real-time Socket.io alerts to accredited partner shelters.
              </p>
            </div>

            <div className="clay-card p-6 flex flex-col items-start relative">
              <div className="w-12 h-12 clay-button bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl mb-5 shadow-lg">
                4
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg mb-2">Route & Deliver</h4>
              <p className="text-slate-600 text-sm font-semibold leading-relaxed">
                Logistics engine routes driver pickup and delivery with live telemetry status updates.
              </p>
            </div>
          </div>
        </section>

        {/* Architecture & Tech Stack Highlights */}
        <section id="architecture" className="w-full max-w-6xl mt-28 text-left">
          <div className="clay-arch p-8 md:p-12">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="space-y-4 max-w-2xl">
                <div className="clay-pill px-4 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-widest inline-block">
                  High-Performance Architecture
                </div>
                <h3 className="text-3xl lg:text-4xl font-black tracking-tight text-white">
                  Built with Modern, Real-Time Technologies
                </h3>
                <p className="text-slate-300 font-medium leading-relaxed">
                  Fastify Node backend with Socket.io RPC events, standalone Python FastAPI microservice running PaddleOCR, and Next.js 16 with Claymorphism 3D styling.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 max-w-md">
                {[
                  { label: 'Fastify 5.2', bg: 'bg-indigo-500/25', text: 'text-indigo-200', border: 'border-indigo-400/40' },
                  { label: 'Socket.io 4.8', bg: 'bg-purple-500/25', text: 'text-purple-200', border: 'border-purple-400/40' },
                  { label: 'Python PaddleOCR', bg: 'bg-emerald-500/25', text: 'text-emerald-200', border: 'border-emerald-400/40' },
                  { label: 'Swagger OpenAPI 3.0', bg: 'bg-amber-500/25', text: 'text-amber-200', border: 'border-amber-400/40' },
                  { label: 'Next.js 16 App Router', bg: 'bg-sky-500/25', text: 'text-sky-200', border: 'border-sky-400/40' },
                ].map(({ label, bg, text, border }) => (
                  <div
                    key={label}
                    className={`clay-pill px-4 py-2.5 ${bg} ${text} ${border} font-extrabold text-sm backdrop-blur-md border`}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Claymorphic Dark Footer */}
      <footer className="bg-slate-950 text-white pt-20 pb-12 px-6 border-t border-slate-800 relative z-10">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-3 text-emerald-400">
                <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
                  <Leaf className="h-6 w-6 text-emerald-400" />
                </div>
                <span className="text-2xl font-black tracking-tight text-white">FoodLoop AI</span>
              </div>
              <p className="text-slate-400 text-sm max-w-sm font-medium leading-relaxed">
                Empowering kitchens, food banks, and drivers with AI demand prediction, PaddleOCR label scanning, and real-time Socket.io redistribution.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Platform & APIs</h4>
              <ul className="space-y-2.5 text-sm text-slate-400 font-medium">
                <li>
                  <a href="http://localhost:3001/docs" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors flex items-center">
                    Swagger OpenAPI Specs
                  </a>
                </li>
                <li>
                  <Link href="/dashboard/admin/health" className="hover:text-emerald-400 transition-colors">
                    System Health & Telemetry
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/admin/ai-command" className="hover:text-emerald-400 transition-colors">
                    AI Command Center
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Quick Links</h4>
              <ul className="space-y-2.5 text-sm text-slate-400 font-medium">
                <li><Link href="/login" className="hover:text-emerald-400 transition-colors">Sign In</Link></li>
                <li><Link href="/register" className="hover:text-emerald-400 transition-colors">Create Account</Link></li>
                <li><Link href="/dashboard/kitchen" className="hover:text-emerald-400 transition-colors">Kitchen Portal</Link></li>
                <li><Link href="/dashboard/ngo" className="hover:text-emerald-400 transition-colors">NGO Dashboard</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 font-medium gap-4">
            <p>© 2026 FoodLoop AI. Built with Next.js, Fastify, Socket.io & Python PaddleOCR.</p>
            <div className="flex items-center space-x-2 text-emerald-400 font-bold bg-slate-900 px-4 py-1.5 rounded-full border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
