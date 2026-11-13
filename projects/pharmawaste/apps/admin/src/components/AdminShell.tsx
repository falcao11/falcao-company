'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { adminApi } from '@/lib/api';
import {
  AccountRequestItem,
  AdminDashboardData,
  PharmacyItem,
  SubscriptionItem,
  SubscriptionPlanItem,
} from '@/lib/types';
import { DashboardTab } from './DashboardTab';
import { RequestsTab } from './RequestsTab';
import { PharmaciesTab } from './PharmaciesTab';
import { SubscriptionsTab } from './SubscriptionsTab';
import {
  LayoutDashboard,
  Inbox,
  Building2,
  CreditCard,
  ShieldCheck,
  LogOut,
  RefreshCw,
} from 'lucide-react';

type AdminTab = 'dashboard' | 'requests' | 'pharmacies' | 'subscriptions';

interface AdminShellProps {
  initialDashboard: AdminDashboardData;
  initialPharmacies: PharmacyItem[];
  initialRequests: AccountRequestItem[];
  initialPlans: SubscriptionPlanItem[];
  initialSubscriptions: SubscriptionItem[];
}

export function AdminShell({
  initialDashboard,
  initialPharmacies,
  initialRequests,
  initialPlans,
  initialSubscriptions,
}: AdminShellProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const { data: dashboard = initialDashboard } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.get<AdminDashboardData>('/dashboard'),
    initialData: initialDashboard,
  });

  const { data: pharmacies = initialPharmacies } = useQuery({
    queryKey: ['admin', 'pharmacies'],
    queryFn: () => adminApi.get<PharmacyItem[]>('/pharmacies'),
    initialData: initialPharmacies,
  });

  const { data: requests = initialRequests } = useQuery({
    queryKey: ['admin', 'account-requests'],
    queryFn: () => adminApi.get<AccountRequestItem[]>('/account-requests'),
    initialData: initialRequests,
  });

  const { data: plans = initialPlans } = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => adminApi.get<SubscriptionPlanItem[]>('/plans'),
    initialData: initialPlans,
  });

  const { data: subscriptions = initialSubscriptions } = useQuery({
    queryKey: ['admin', 'subscriptions'],
    queryFn: () => adminApi.get<SubscriptionItem[]>('/subscriptions'),
    initialData: initialSubscriptions,
  });

  const signOutMutation = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      queryClient.clear();
      router.push('/sign-in');
      router.refresh();
    },
  });

  const pendingCount = dashboard.kpis.pendingAccountRequests;

  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'requests',
      label: 'Pedidos de Conta',
      icon: Inbox,
      badge: pendingCount,
    },
    { id: 'pharmacies', label: 'Farmácias & Users', icon: Building2 },
    { id: 'subscriptions', label: 'Subscrições & Planos', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-slate-950 text-slate-100 flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-white leading-tight">
              PharmaWaste Admin
            </p>
            <p className="text-[11px] text-slate-400">Falcão Company</p>
          </div>
        </div>

        <nav className="flex-1 p-3 flex lg:flex-col gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer shrink-0 ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  {item.label}
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      active
                        ? 'bg-white text-emerald-700'
                        : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 hidden lg:block">
          <button
            type="button"
            onClick={() => signOutMutation.mutate()}
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Terminar Sessão Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {navItems.find((i) => i.id === activeTab)?.label}
            </h1>
            <p className="text-xs text-slate-500">
              Gestão centralizada de farmácias, utilizadores, demonstrações e faturação SaaS
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['admin'] })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => signOutMutation.mutate()}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardTab
              dashboard={dashboard}
              onNavigateToRequests={() => setActiveTab('requests')}
            />
          )}
          {activeTab === 'requests' && (
            <RequestsTab requests={requests} plans={plans} />
          )}
          {activeTab === 'pharmacies' && (
            <PharmaciesTab pharmacies={pharmacies} plans={plans} />
          )}
          {activeTab === 'subscriptions' && (
            <SubscriptionsTab
              plans={plans}
              subscriptions={subscriptions}
              pharmacies={pharmacies}
            />
          )}
        </main>
      </div>
    </div>
  );
}
