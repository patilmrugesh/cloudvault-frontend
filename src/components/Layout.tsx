import React, { useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import {
  LogOut,
  Shield,
  LayoutDashboard,
  UploadCloud,
  Menu,
  X,
  Database,
  Layers,
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Upload & Ingest', path: '/upload', icon: UploadCloud },
  ];

  const currentNav = navItems.find((item) => item.path === location.pathname) || navItems[0];

  return (
    <div className="flex h-screen bg-[#0B0D13] text-slate-100 overflow-hidden font-sans">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0F121C] border-r border-white/[0.08] flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-white/[0.08] flex items-center justify-between">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1 -m-1"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-base tracking-tight text-white leading-none">
                CloudVault
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mt-1">
                Distributed Storage
              </span>
            </div>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white md:hidden"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div className="pt-6 px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Architecture
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-[#141824]/60 border border-white/[0.04] space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>MinIO Object Store</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>PostgreSQL Metadata</span>
            </div>
          </div>
        </div>

        {/* User Account / Session Footer */}
        <div className="p-3 border-t border-white/[0.08] bg-[#0C0E17]/60">
          <div className="px-3 py-2.5 rounded-lg bg-[#141824] border border-white/[0.06] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {user.username.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {user.username}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  Vault Member
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign out of CloudVault"
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 px-4 sm:px-8 border-b border-white/[0.08] bg-[#0E111A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 hidden sm:inline">Workspace</span>
              <span className="text-slate-600 hidden sm:inline">/</span>
              <h1 className="text-sm sm:text-base font-semibold text-slate-100">
                {currentNav.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs bg-[#141824] px-3 py-1.5 rounded-full border border-white/[0.08] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium">Vault Online</span>
            </div>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
