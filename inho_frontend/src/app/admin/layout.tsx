"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { authApi } from '@/lib/api';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  LogOut,
  Globe
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const user = await authApi.me();
        if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
          setIsAdmin(true);
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        router.push('/login');
      }
    }
    checkAdmin();
  }, [router]);

  if (isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-[#0F172A]">Carregando painel...</div>;
  }

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Usuários', icon: Users, path: '/admin/users' },
    { name: 'Auditoria', icon: ShieldAlert, path: '/admin/audit' },
  ];

  return (
    <div className="flex h-screen bg-white text-gray-100 font-sans">
      {/* Sidebar (Admin Theme) */}
      <aside className="w-64 bg-white border-r border-[#E2E8F0] flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500 flex items-center gap-2">
            <Globe className="w-6 h-6 text-purple-700" />
            INHO Admin
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive
                  ? 'bg-purple-500/20 text-purple-700 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                  : 'text-[#64748B] hover:bg-white hover:text-[#0F172A]'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E2E8F0]">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-[#64748B] hover:text-[#0F172A] transition-colors rounded-xl hover:bg-white"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair do Admin</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-black p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
