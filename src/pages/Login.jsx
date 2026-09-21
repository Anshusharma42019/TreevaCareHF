import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { 
    icon: (
      <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ), 
    title: 'Patient Consults', 
    sub: 'Case histories & notes' 
  },
  { 
    icon: (
      <svg className="w-5 h-5 text-emerald-300" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1.41-3.53C8.73 18.16 10.86 18 13 18c3 0 5.5-2.5 5.5-5.5a5.5 5.5 0 0 0-1.5-3.8" />
        <path d="M14.5 2c-3.2 0-5.8 2.2-6.4 5.2" />
      </svg>
    ), 
    title: 'Homeopathy Care', 
    sub: 'Potency & remedy log' 
  },
  { 
    icon: (
      <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 5v3h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ), 
    title: 'Medicine Logistics', 
    sub: 'Shiprocket & ShipMaxx' 
  },
];

const ROLES = [
  { 
    id: 'admin', 
    label: 'Admin', 
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ) 
  },
  { 
    id: 'doctor', 
    label: 'Doctor', 
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ) 
  },
  { 
    id: 'manager', 
    label: 'Manager', 
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v1.094m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    ) 
  },
  { 
    id: 'sales', 
    label: 'Staff', 
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ) 
  },
  { 
    id: 'logistics', 
    label: 'Logistics', 
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0C2.678 5.578 2.25 6.058 2.25 6.626v1.442" />
      </svg>
    ) 
  },
  { 
    id: 'support', 
    label: 'Support', 
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ) 
  },
];

export default function Login() {
  const [form, setForm] = useState({ role: 'admin', email: '', phone: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 font-sans">

      {/* ── Left Hero Panel (Botanical Glassmorphism) ── */}
      <div 
        className="relative flex flex-col justify-between overflow-hidden md:w-[55%] md:min-h-screen w-full px-6 py-10 md:p-14 text-white"
        style={{ 
          background: 'linear-gradient(135deg, rgba(6, 32, 16, 0.94) 0%, rgba(10, 50, 26, 0.92) 50%, rgba(4, 24, 12, 0.96) 100%), url(/botanical_bg.jpg) center/cover no-repeat',
        }}
      >
        {/* Soft Glowing Ambient Lights */}
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full opacity-35 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #34d399, transparent)' }} />
        <div className="absolute bottom-[-100px] right-[-100px] w-[450px] h-[450px] rounded-full opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #10b981, transparent)' }} />

        {/* Brand Emblem Header */}
        <div className="relative flex items-center gap-3.5 z-10">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur opacity-70 group-hover:opacity-100 transition duration-300" />
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-900 border border-emerald-300/50 flex items-center justify-center shadow-xl shadow-emerald-950/60">
              <svg className="w-7 h-7 text-emerald-300 drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1.41-3.53C8.73 18.16 10.86 18 13 18c3 0 5.5-2.5 5.5-5.5a5.5 5.5 0 0 0-1.5-3.8" />
                <path d="M14.5 2c-3.2 0-5.8 2.2-6.4 5.2" />
              </svg>
            </div>
          </div>

          <div>
            <div className="font-black text-2xl tracking-wider leading-none text-white drop-shadow-md">
              TREEVA
            </div>
            <div className="text-emerald-300 text-[10px] font-black tracking-[0.25em] mt-1 uppercase">
              HOMEOPATHY CLINIC CRM
            </div>
          </div>
        </div>

        {/* Center Content / Headline */}
        <div className="relative hidden md:block z-10 my-10 space-y-7">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-md shadow-inner">
            <svg className="w-3.5 h-3.5 text-emerald-300 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1.41-3.53C8.73 18.16 10.86 18 13 18c3 0 5.5-2.5 5.5-5.5a5.5 5.5 0 0 0-1.5-3.8" />
            </svg>
            <span className="text-emerald-300 text-xs font-black uppercase tracking-widest">
              Empowering Natural Healing
            </span>
          </div>

          <h1 className="text-white font-black text-4xl lg:text-5xl tracking-tight leading-[1.15] drop-shadow-lg">
            Holistic Care &<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-green-300">
              Homeopathy Operating System
            </span>
          </h1>

          <p className="text-emerald-100/90 text-sm lg:text-base max-w-lg leading-relaxed font-medium">
            Streamline patient clinical records, homeopathic remedy prescriptions, appointment schedules, follow-up queues, and courier shipments in one unified platform.
          </p>

          {/* Quick Homeopathy Badges */}
          <div className="flex flex-wrap gap-3 pt-1">
            <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md text-xs font-bold text-emerald-200 flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
              </svg>
              <span>Remedy Potency & Dosing</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md text-xs font-bold text-emerald-200 flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span>Doctor Consultations</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md text-xs font-bold text-emerald-200 flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <rect x="1" y="3" width="15" height="13" rx="1" />
                <path d="M16 8h4l3 5v3h-7V8z" />
              </svg>
              <span>Shiprocket & ShipMaxx</span>
            </div>
          </div>
        </div>

        {/* Bottom Glass Feature Cards */}
        <div className="relative grid grid-cols-3 gap-3.5 z-10 mt-6 md:mt-0">
          {FEATURES.map(({ icon, title, sub }) => (
            <div 
              key={title} 
              className="rounded-2xl p-4 backdrop-blur-md bg-white/10 border border-white/15 shadow-xl shadow-emerald-950/40 hover:bg-white/15 hover:border-emerald-400/40 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="mb-2.5 p-2 w-fit rounded-xl bg-emerald-500/20 border border-emerald-400/30">
                {icon}
              </div>
              <div className="text-white font-bold text-xs md:text-sm">{title}</div>
              <div className="text-emerald-200/80 text-[10px] md:text-xs mt-0.5 font-medium">{sub}</div>
            </div>
          ))}
        </div>

        {/* Developer Credit Badge */}
        <div className="relative z-10 pt-6 flex items-center justify-between border-t border-white/10 mt-6 text-xs">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/30 border border-white/15 backdrop-blur-md shadow-inner">
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
            <span className="text-white/90 font-medium text-[11px]">
              Developed By <span className="font-extrabold text-emerald-300 tracking-wide">Er. Anshu Sharma</span>
            </span>
          </div>
          <span className="text-emerald-200/60 text-[10px] font-semibold hidden lg:inline">
            Treeva Health Tech v2.5
          </span>
        </div>
      </div>

      {/* ── Right Panel (Glass Floating Login Card) ── */}
      <div 
        className="flex-1 flex items-center justify-center px-6 py-12 md:px-16"
        style={{
          background: 'linear-gradient(145deg, #f0fdf4 0%, #e6f4ea 50%, #f4fbf7 100%)',
        }}
      >
        <div className="w-full max-w-md bg-white/90 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-white/80 shadow-emerald-950/10">

          {/* Form Title Header */}
          <div className="mb-8 text-center md:text-left">
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-[10px] font-black uppercase tracking-widest mb-3 border border-emerald-200/60">
              SECURE CLINIC PORTAL
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-gray-500 text-xs md:text-sm mt-1 font-medium">
              Sign in with your Treeva CRM credentials
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-2xl mb-6 flex items-center gap-2.5 font-semibold animate-shake">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Picker Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">
                  Select Your Role
                </label>
                <span className="text-[10px] text-emerald-600 font-extrabold capitalize bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {form.role} Active
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setForm({ ...form, role: r.id })}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      form.role === r.id
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md shadow-emerald-950/20 scale-[1.02]'
                        : 'bg-gray-50/90 text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-200'
                    }`}
                  >
                    <span>{r.icon}</span>
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Email / Phone Field */}
            {form.role === 'admin' ? (
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                  Admin Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="admin@treeva.com"
                    className="w-full border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 bg-gray-50/80 transition-all shadow-inner"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                  Registered Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Enter registered mobile number"
                    className="w-full border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 bg-gray-50/80 transition-all shadow-inner"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-2xl pl-11 pr-16 py-3.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 bg-gray-50/80 transition-all shadow-inner"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-emerald-700 hover:text-emerald-900 font-extrabold uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200/60"
                >
                  {showPass ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl text-xs font-black text-white uppercase tracking-widest transition-all disabled:opacity-60 shadow-xl shadow-emerald-950/20 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] mt-2"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' }}
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN TO CLINIC →'}
            </button>
          </form>

          {/* Security Footer Note */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              HIPAA Compliant • 256-Bit SSL
            </span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">v2.5</span>
          </div>

        </div>
      </div>
    </div>
  );
}


