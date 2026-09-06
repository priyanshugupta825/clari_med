import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  Activity,
  Pill,
  ShieldAlert,
  UserCheck,
  HeartPulse,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Health Vault', path: '/upload', icon: UploadCloud, badge: 'AI Parser' },
  { name: 'Health Timeline', path: '/timeline', icon: Activity },
  { name: 'Medicine Manager', path: '/medicines', icon: Pill },
  { name: 'Emergency Card & QR', path: '/emergency', icon: ShieldAlert, highlight: true },
  { name: 'Doctor Portal (Share)', path: '/doctor-portal', icon: UserCheck },
];

export const Sidebar = ({ isMobileOpen, closeMobile }) => {
  const { user } = useAuth();
  const abhaId = user?.user_metadata?.abha_id || '91-4521-8890-4123';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-brand-200/60 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Branding */}
        <div>
          <div className="h-16 flex items-center px-6 border-b border-brand-100 gap-3 bg-brand-50/50">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm shadow-brand-600/20">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-brand-950 text-base tracking-tight leading-tight">
                ClariMed
              </h1>
              <p className="text-[11px] font-semibold text-brand-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Creative Tinkers
              </p>
            </div>
          </div>

          {/* ABHA Badge Card */}
          <div className="mx-4 my-4 p-3 bg-gradient-to-br from-brand-100/60 via-brand-50 to-sand-100/60 border border-brand-200/70 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800">
                ABHA Linked
              </span>
              <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse"></span>
            </div>
            <p className="font-mono text-xs font-semibold text-brand-950 tracking-wide">
              {abhaId}
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-100 text-brand-900 font-semibold border border-brand-200/80 shadow-2xs'
                        : item.highlight
                        ? 'text-emergency-700 hover:bg-emergency-50'
                        : 'text-slate-600 hover:text-brand-900 hover:bg-brand-50'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        item.highlight ? 'text-emergency-500' : 'text-brand-600'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-200/70 text-brand-800">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Safety & Disclaimer footer */}
        <div className="p-4 border-t border-brand-100">
          <div className="p-3 rounded-xl bg-sand-100/90 border border-sand-300 text-[11px] text-sand-700 leading-relaxed">
            <span className="font-semibold text-sand-800 block">AI Clinical Guardrail</span>
            Insights are assistive. Consult your certified doctor for medical decisions.
          </div>
        </div>
      </aside>
    </>
  );
};
