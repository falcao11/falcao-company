'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, getApiErrorMessage } from '@/lib/api';
import { AccountRequestItem, SubscriptionPlanItem } from '@/lib/types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  Building2,
  Loader2,
  X,
} from 'lucide-react';

interface RequestsTabProps {
  requests: AccountRequestItem[];
  plans: SubscriptionPlanItem[];
}

export function RequestsTab({ requests, plans }: RequestsTabProps) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [approving, setApproving] = useState<AccountRequestItem | null>(null);

  const [pharmacyName, setPharmacyName] = useState('');
  const [nif, setNif] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('Pharma2026!');
  const [isDemo, setIsDemo] = useState(true);
  const [demoDays, setDemoDays] = useState(14);
  const [planId, setPlanId] = useState('');

  const openApproveModal = (req: AccountRequestItem) => {
    setApproving(req);
    setPharmacyName(req.pharmacyName);
    setNif(req.nif || '');
    setLicenseNumber(req.licenseNumber || '');
    setOwnerName(req.contactName);
    setOwnerEmail(req.email);
    setOwnerUsername(req.email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase());
    setOwnerPassword('Pharma2026!');
    setIsDemo(true);
    setDemoDays(14);
    setPlanId('');
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      adminApi.post(`/account-requests/${id}/approve`, {
        pharmacyName,
        nif: nif || undefined,
        licenseNumber: licenseNumber || undefined,
        ownerName,
        ownerEmail,
        ownerUsername: ownerUsername || undefined,
        ownerPassword,
        isDemo,
        demoDays: isDemo ? demoDays : undefined,
        planId: planId || undefined,
      }),
    onSuccess: () => {
      setApproving(null);
      invalidateAll();
    },
    onError: (err) => {
      alert(getApiErrorMessage(err, 'Erro ao aprovar pedido.'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      adminApi.patch(`/account-requests/${id}/status`, { status: 'REJECTED' }),
    onSuccess: invalidateAll,
    onError: (err) => {
      alert(getApiErrorMessage(err, 'Erro ao rejeitar pedido.'));
    },
  });

  const filtered = requests.filter((r) => filter === 'ALL' || r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Pedidos de Conta & Demonstração
          </h2>
          <p className="text-xs text-slate-500">
            Cada pedido submetido no portal gera uma notificação por email e aparece aqui para aprovação.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filter === status
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status === 'ALL'
                ? 'Todos'
                : status === 'PENDING'
                  ? 'Pendentes'
                  : status === 'APPROVED'
                    ? 'Aprovados'
                    : 'Rejeitados'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Nenhum pedido encontrado para este filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <h3 className="font-bold text-slate-900">{req.pharmacyName}</h3>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      req.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : req.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {req.status === 'PENDING'
                      ? 'Pendente'
                      : req.status === 'APPROVED'
                        ? 'Aprovado'
                        : 'Rejeitado'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>
                    <strong>Responsável:</strong> {req.contactName}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {req.email}
                    {req.phone && (
                      <>
                        <span className="text-slate-300">·</span>
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {req.phone}
                      </>
                    )}
                  </p>
                  {(req.nif || req.licenseNumber) && (
                    <p>
                      <strong>NIF:</strong> {req.nif || '—'} ·{' '}
                      <strong>Alvará:</strong> {req.licenseNumber || '—'}
                    </p>
                  )}
                  {req.notes && (
                    <p className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 mt-2">
                      {req.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(req.createdAt).toLocaleString('pt-PT')}
                </span>

                {req.status === 'PENDING' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => rejectMutation.mutate(req.id)}
                      disabled={rejectMutation.isPending}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Rejeitar
                    </button>
                    <button
                      type="button"
                      onClick={() => openApproveModal(req)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Aprovar & Criar Conta
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Aprovação */}
      {approving && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                Aprovar Pedido e Criar Farmácia
              </h3>
              <button
                type="button"
                onClick={() => setApproving(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                approveMutation.mutate(approving.id);
              }}
              className="p-6 space-y-3.5 max-h-[80vh] overflow-y-auto"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome da Farmácia
                </label>
                <input
                  type="text"
                  value={pharmacyName}
                  onChange={(e) => setPharmacyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    NIF
                  </label>
                  <input
                    type="text"
                    value={nif}
                    onChange={(e) => setNif(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Alvará
                  </label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nome do Utilizador Owner *
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={ownerUsername}
                    onChange={(e) => setOwnerUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Password Inicial *
                  </label>
                  <input
                    type="text"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDemo}
                    onChange={(e) => setIsDemo(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  Criar como Conta Demonstração
                </label>

                {isDemo && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Duração da Demo (dias)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={demoDays}
                      onChange={(e) => setDemoDays(Number(e.target.value))}
                      className="w-32 px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Plano de Subscrição (opcional)
                  </label>
                  <select
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  >
                    <option value="">Sem subscrição associada</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.monthlyPrice.toFixed(2)} €/mês
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApproving(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={approveMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                >
                  {approveMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Criar Farmácia e Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
