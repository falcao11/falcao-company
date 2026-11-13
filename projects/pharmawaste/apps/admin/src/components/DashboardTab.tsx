'use client';

import React from 'react';
import { AdminDashboardData } from '@/lib/types';
import {
  Euro,
  Building2,
  Users,
  Inbox,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

interface DashboardTabProps {
  dashboard: AdminDashboardData;
  onNavigateToRequests: () => void;
}

export function DashboardTab({
  dashboard,
  onNavigateToRequests,
}: DashboardTabProps) {
  const { kpis, monthlySeries, recentRequests } = dashboard;
  const maxRevenue = Math.max(...monthlySeries.map((m) => m.revenue), 100);
  const maxCount = Math.max(
    ...monthlySeries.map((m) => Math.max(m.newPharmacies, m.newUsers)),
    1,
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Receita Mensal (MRR)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Euro className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3">
            {kpis.mrr.toFixed(2)} €
          </p>
          <p className="text-xs text-slate-500 mt-1">
            ARR estimado: <strong className="text-slate-700">{kpis.arr.toFixed(2)} €</strong> ·{' '}
            {kpis.activeSubscriptionsCount} subscrições ativas
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Farmácias
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3">
            {kpis.totalPharmacies}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {kpis.activePharmacies} ativas · {kpis.demoPharmacies} em demo ·{' '}
            <span className="text-emerald-600 font-medium">
              +{kpis.newPharmaciesLast30Days} (30d)
            </span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Utilizadores
            </span>
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3">
            {kpis.totalUsers}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            <span className="text-emerald-600 font-medium">
              +{kpis.newUsersLast30Days} novos
            </span>{' '}
            nos últimos 30 dias
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pedidos Pendentes
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3">
            {kpis.pendingAccountRequests}
          </p>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            {kpis.expiredDemoPharmacies > 0 ? (
              <span className="text-rose-600 font-medium inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {kpis.expiredDemoPharmacies} demo(s) expiradas
              </span>
            ) : (
              'Pedidos de acesso por aprovar'
            )}
          </p>
        </div>
      </div>

      {/* Charts + Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Evolução Mensal (Últimos 6 Meses)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Receita recorrente (MRR) e novas entradas de farmácias e utilizadores
              </p>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 items-end h-52 pt-4">
            {monthlySeries.map((m) => {
              const revHeight = Math.max(
                Math.round((m.revenue / maxRevenue) * 100),
                m.revenue > 0 ? 12 : 4,
              );
              const farmHeight = Math.max(
                Math.round((m.newPharmacies / maxCount) * 100),
                m.newPharmacies > 0 ? 14 : 4,
              );
              const userHeight = Math.max(
                Math.round((m.newUsers / maxCount) * 100),
                m.newUsers > 0 ? 14 : 4,
              );

              return (
                <div key={m.month} className="flex flex-col items-center h-full">
                  <div className="flex-1 w-full flex items-end justify-center gap-1.5 px-1">
                    <div
                      title={`Receita: ${m.revenue.toFixed(2)} €`}
                      style={{ height: `${revHeight}%` }}
                      className="w-3.5 rounded-t-md bg-emerald-500 transition-all"
                    />
                    <div
                      title={`Novas Farmácias: ${m.newPharmacies}`}
                      style={{ height: `${farmHeight}%` }}
                      className="w-3.5 rounded-t-md bg-sky-500 transition-all"
                    />
                    <div
                      title={`Novos Utilizadores: ${m.newUsers}`}
                      style={{ height: `${userHeight}%` }}
                      className="w-3.5 rounded-t-md bg-violet-500 transition-all"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 mt-2">
                    {m.month}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {m.revenue.toFixed(0)}€
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-5 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              Receita Mensal (€)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
              Novas Farmácias
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-violet-500" />
              Novos Utilizadores
            </span>
          </div>
        </div>

        {/* Recent Requests */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Pedidos Recentes
            </h3>
            <button
              type="button"
              onClick={onNavigateToRequests}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer"
            >
              Ver todos
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentRequests.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-slate-400 text-sm">
              <Clock className="w-8 h-8 mb-2 opacity-60" />
              Sem pedidos pendentes no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {req.pharmacyName}
                    </p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Novo
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 truncate">
                    {req.contactName} · {req.email}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {new Date(req.createdAt).toLocaleString('pt-PT')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
