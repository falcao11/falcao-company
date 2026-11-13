'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, getApiErrorMessage } from '@/lib/api';
import { planSchema, subscriptionSchema } from '@/lib/schemas';
import {
  PharmacyItem,
  SubscriptionItem,
  SubscriptionPlanItem,
} from '@/lib/types';
import { Plus, Pencil, Trash2, CreditCard, Package, X, Loader2 } from 'lucide-react';

interface SubscriptionsTabProps {
  plans: SubscriptionPlanItem[];
  subscriptions: SubscriptionItem[];
  pharmacies: PharmacyItem[];
}

export function SubscriptionsTab({
  plans,
  subscriptions,
  pharmacies,
}: SubscriptionsTabProps) {
  const queryClient = useQueryClient();

  // Plan modal state
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanItem | null>(null);
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planPrice, setPlanPrice] = useState('99');
  const [planMaxUsers, setPlanMaxUsers] = useState('5');
  const [planIsActive, setPlanIsActive] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);

  // Subscription modal state
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubscriptionItem | null>(null);
  const [subOrgId, setSubOrgId] = useState('');
  const [subPlanId, setSubPlanId] = useState('');
  const [subStatus, setSubStatus] = useState<'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELED'>('ACTIVE');
  const [subPrice, setSubPrice] = useState('99');
  const [subNotes, setSubNotes] = useState('');
  const [subError, setSubError] = useState<string | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const openCreatePlan = () => {
    setEditingPlan(null);
    setPlanName('');
    setPlanDescription('');
    setPlanPrice('99');
    setPlanMaxUsers('5');
    setPlanIsActive(true);
    setPlanError(null);
    setPlanModalOpen(true);
  };

  const openEditPlan = (plan: SubscriptionPlanItem) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanDescription(plan.description || '');
    setPlanPrice(String(plan.monthlyPrice));
    setPlanMaxUsers(String(plan.maxUsers));
    setPlanIsActive(plan.isActive);
    setPlanError(null);
    setPlanModalOpen(true);
  };

  const savePlanMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      description?: string;
      monthlyPrice: number;
      maxUsers: number;
      isActive: boolean;
    }) => {
      if (editingPlan) {
        return adminApi.patch(`/plans/${editingPlan.id}`, values);
      }
      return adminApi.post('/plans', values);
    },
    onSuccess: () => {
      setPlanModalOpen(false);
      invalidateAll();
    },
    onError: (err) => {
      setPlanError(getApiErrorMessage(err, 'Erro ao guardar plano.'));
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/plans/${id}`),
    onSuccess: invalidateAll,
    onError: (err) => {
      alert(getApiErrorMessage(err, 'Não foi possível remover o plano.'));
    },
  });

  const openCreateSub = () => {
    setEditingSub(null);
    setSubOrgId(pharmacies[0]?.id || '');
    const firstPlan = plans[0];
    setSubPlanId(firstPlan?.id || '');
    setSubPrice(String(firstPlan?.monthlyPrice ?? 99));
    setSubStatus('ACTIVE');
    setSubNotes('');
    setSubError(null);
    setSubModalOpen(true);
  };

  const openEditSub = (sub: SubscriptionItem) => {
    setEditingSub(sub);
    setSubOrgId(sub.organizationId);
    setSubPlanId(sub.planId);
    setSubPrice(String(sub.monthlyPrice));
    setSubStatus(sub.status);
    setSubNotes(sub.notes || '');
    setSubError(null);
    setSubModalOpen(true);
  };

  const saveSubMutation = useMutation({
    mutationFn: async (values: {
      organizationId: string;
      planId: string;
      status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELED';
      monthlyPrice: number;
      notes?: string;
    }) => {
      if (editingSub) {
        return adminApi.patch(`/subscriptions/${editingSub.id}`, {
          planId: values.planId,
          status: values.status,
          monthlyPrice: values.monthlyPrice,
          notes: values.notes,
        });
      }
      return adminApi.post('/subscriptions', values);
    },
    onSuccess: () => {
      setSubModalOpen(false);
      invalidateAll();
    },
    onError: (err) => {
      setSubError(getApiErrorMessage(err, 'Erro ao guardar subscrição.'));
    },
  });

  const deleteSubMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/subscriptions/${id}`),
    onSuccess: invalidateAll,
    onError: (err) => {
      alert(getApiErrorMessage(err, 'Erro ao remover subscrição.'));
    },
  });

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPlanError(null);
    const parsed = planSchema.safeParse({
      name: planName,
      description: planDescription,
      monthlyPrice: Number(planPrice),
      maxUsers: Number(planMaxUsers),
      isActive: planIsActive,
    });
    if (!parsed.success) {
      setPlanError(parsed.error.issues[0]?.message || 'Dados inválidos.');
      return;
    }
    savePlanMutation.mutate(parsed.data);
  };

  const handleSubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubError(null);
    const parsed = subscriptionSchema.safeParse({
      organizationId: subOrgId,
      planId: subPlanId,
      status: subStatus,
      monthlyPrice: Number(subPrice),
      notes: subNotes,
    });
    if (!parsed.success) {
      setSubError(parsed.error.issues[0]?.message || 'Dados inválidos.');
      return;
    }
    saveSubMutation.mutate(parsed.data);
  };

  return (
    <div className="space-y-8">
      {/* 1. PLANOS DE SUBSCRIÇÃO */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              Planos de Subscrição
            </h2>
            <p className="text-xs text-slate-500">
              Crie, edite ou remova os planos comerciais do PharmaWaste.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreatePlan}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar Plano
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900">{plan.name}</h3>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      plan.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {plan.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mt-2">
                  {plan.monthlyPrice.toFixed(2)} €
                  <span className="text-xs font-normal text-slate-500"> / mês</span>
                </p>
                {plan.description && (
                  <p className="text-xs text-slate-600 mt-2">{plan.description}</p>
                )}
                <p className="text-xs text-slate-500 mt-3">
                  Até <strong>{plan.maxUsers}</strong> utilizadores ·{' '}
                  <strong>{plan._count?.subscriptions ?? 0}</strong> farmácia(s)
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openEditPlan(plan)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remover o plano "${plan.name}"?`)) {
                      deletePlanMutation.mutate(plan.id);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-xs font-medium text-rose-700 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. SUBSCRIÇÕES POR FARMÁCIA */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-sky-600" />
              Subscrições das Farmácias
            </h2>
            <p className="text-xs text-slate-500">
              Associe, ajuste valores ou cancele subscrições. As subscrições com estado <strong>ACTIVE</strong> entram diretamente no MRR mensal.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateSub}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Atribuir Subscrição
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-3 px-4">Farmácia</th>
                  <th className="py-3 px-4">Plano</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Valor Mensal</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Nenhuma subscrição configurada.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {sub.organization.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{sub.plan.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                            sub.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : sub.status === 'TRIAL'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {sub.monthlyPrice.toFixed(2)} €
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditSub(sub)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                `Remover a subscrição de "${sub.organization.name}"?`,
                              )
                            ) {
                              deleteSubMutation.mutate(sub.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 text-xs font-medium text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Modal Plan */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                {editingPlan ? 'Editar Plano' : 'Novo Plano de Subscrição'}
              </h3>
              <button
                type="button"
                onClick={() => setPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePlanSubmit} className="p-6 space-y-3.5">
              {planError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {planError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome do Plano *
                </label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Preço Mensal (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Máx. Utilizadores *
                  </label>
                  <input
                    type="number"
                    value={planMaxUsers}
                    onChange={(e) => setPlanMaxUsers(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planIsActive}
                  onChange={(e) => setPlanIsActive(e.target.checked)}
                />
                Plano ativo para novas subscrições
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savePlanMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
                >
                  {savePlanMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Guardar Plano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Subscription */}
      {subModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                {editingSub ? 'Editar Subscrição' : 'Atribuir Subscrição'}
              </h3>
              <button
                type="button"
                onClick={() => setSubModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubSubmit} className="p-6 space-y-3.5">
              {subError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {subError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Farmácia *
                </label>
                <select
                  value={subOrgId}
                  disabled={Boolean(editingSub)}
                  onChange={(e) => setSubOrgId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-50"
                >
                  {pharmacies.map((ph) => (
                    <option key={ph.id} value={ph.id}>
                      {ph.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Plano *
                </label>
                <select
                  value={subPlanId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSubPlanId(nextId);
                    const found = plans.find((p) => p.id === nextId);
                    if (found) setSubPrice(String(found.monthlyPrice));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.monthlyPrice.toFixed(2)} €)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Estado *
                  </label>
                  <select
                    value={subStatus}
                    onChange={(e) =>
                      setSubStatus(
                        e.target.value as 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELED',
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="TRIAL">TRIAL</option>
                    <option value="PAST_DUE">PAST_DUE</option>
                    <option value="CANCELED">CANCELED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Valor Mensal (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={subPrice}
                    onChange={(e) => setSubPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notas
                </label>
                <input
                  type="text"
                  value={subNotes}
                  onChange={(e) => setSubNotes(e.target.value)}
                  placeholder="Ex: Desconto piloto 3 meses"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveSubMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold cursor-pointer"
                >
                  {saveSubMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Guardar Subscrição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
