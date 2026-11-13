'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, getApiErrorMessage } from '@/lib/api';
import { pharmacySchema, pharmacyUserSchema } from '@/lib/schemas';
import {
  PharmacyItem,
  PharmacyMemberItem,
  SubscriptionPlanItem,
} from '@/lib/types';
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Building2,
  X,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
} from 'lucide-react';

interface PharmaciesTabProps {
  pharmacies: PharmacyItem[];
  plans: SubscriptionPlanItem[];
}

export function PharmaciesTab({ pharmacies, plans }: PharmaciesTabProps) {
  const queryClient = useQueryClient();

  // Pharmacy Create/Edit Modal
  const [pharmacyModalOpen, setPharmacyModalOpen] = useState(false);
  const [editingPharmacy, setEditingPharmacy] = useState<PharmacyItem | null>(
    null,
  );
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [demoDays, setDemoDays] = useState(14);
  const [planId, setPlanId] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);

  // Manage Users Modal
  const [managingPharmacyId, setManagingPharmacyId] = useState<string | null>(
    null,
  );
  const [editingMember, setEditingMember] = useState<PharmacyMemberItem | null>(
    null,
  );
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member'>(
    'member',
  );
  const [userPassword, setUserPassword] = useState('');
  const [userError, setUserError] = useState<string | null>(null);

  const managingPharmacy = pharmacies.find((p) => p.id === managingPharmacyId) || null;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const openCreatePharmacy = () => {
    setEditingPharmacy(null);
    setName('');
    setNif('');
    setLicenseNumber('');
    setIsDemo(false);
    setDemoDays(14);
    setPlanId('');
    setOwnerName('');
    setOwnerEmail('');
    setOwnerUsername('');
    setOwnerPassword('');
    setPharmacyError(null);
    setPharmacyModalOpen(true);
  };

  const openEditPharmacy = (ph: PharmacyItem) => {
    setEditingPharmacy(ph);
    setName(ph.name);
    setNif(ph.nif || '');
    setLicenseNumber(ph.licenseNumber || '');
    setIsDemo(ph.isDemo);
    setDemoDays(14);
    setPlanId(ph.subscription?.planId || '');
    setPharmacyError(null);
    setPharmacyModalOpen(true);
  };

  const savePharmacyMutation = useMutation({
    mutationFn: async () => {
      if (editingPharmacy) {
        return adminApi.patch(`/pharmacies/${editingPharmacy.id}`, {
          name,
          nif,
          licenseNumber,
          isDemo,
          demoExpiresAt: isDemo
            ? editingPharmacy.demoExpiresAt ||
              new Date(Date.now() + demoDays * 24 * 60 * 60 * 1000).toISOString()
            : null,
        });
      }

      return adminApi.post('/pharmacies', {
        name,
        nif: nif || undefined,
        licenseNumber: licenseNumber || undefined,
        isDemo,
        demoDays: isDemo ? demoDays : undefined,
        planId: planId || undefined,
        ownerName: ownerName || undefined,
        ownerEmail: ownerEmail || undefined,
        ownerUsername: ownerUsername || undefined,
        ownerPassword: ownerPassword || undefined,
      });
    },
    onSuccess: () => {
      setPharmacyModalOpen(false);
      invalidateAll();
    },
    onError: (err) => {
      setPharmacyError(getApiErrorMessage(err, 'Erro ao guardar farmácia.'));
    },
  });

  const deletePharmacyMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/pharmacies/${id}`),
    onSuccess: invalidateAll,
    onError: (err) => {
      alert(getApiErrorMessage(err, 'Erro ao remover farmácia.'));
    },
  });

  const extendDemoMutation = useMutation({
    mutationFn: (id: string) =>
      adminApi.patch(`/pharmacies/${id}`, {
        isDemo: true,
        demoExpiresAt: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      }),
    onSuccess: invalidateAll,
  });

  const saveUserMutation = useMutation({
    mutationFn: async () => {
      if (!managingPharmacy) return;
      if (editingMember) {
        return adminApi.patch(
          `/pharmacies/${managingPharmacy.id}/users/${editingMember.userId}`,
          {
            name: userName,
            email: userEmail,
            username: userUsername || undefined,
            role: userRole,
            password: userPassword || undefined,
          },
        );
      }

      return adminApi.post(`/pharmacies/${managingPharmacy.id}/users`, {
        name: userName,
        email: userEmail,
        username: userUsername || undefined,
        role: userRole,
        password: userPassword,
      });
    },
    onSuccess: () => {
      resetUserForm();
      invalidateAll();
    },
    onError: (err) => {
      setUserError(getApiErrorMessage(err, 'Erro ao guardar utilizador.'));
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: ({
      pharmacyId,
      userId,
    }: {
      pharmacyId: string;
      userId: string;
    }) => adminApi.delete(`/pharmacies/${pharmacyId}/users/${userId}`),
    onSuccess: invalidateAll,
    onError: (err) => {
      alert(getApiErrorMessage(err, 'Erro ao remover utilizador.'));
    },
  });

  const resetUserForm = () => {
    setEditingMember(null);
    setUserName('');
    setUserEmail('');
    setUserUsername('');
    setUserRole('member');
    setUserPassword('');
    setUserError(null);
  };

  const handlePharmacySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPharmacyError(null);

    const parsed = pharmacySchema.safeParse({
      name,
      nif,
      licenseNumber,
      isDemo,
      demoDays: isDemo ? demoDays : undefined,
      planId,
      ownerName,
      ownerEmail,
      ownerUsername,
      ownerPassword,
    });

    if (!parsed.success) {
      setPharmacyError(parsed.error.issues[0]?.message || 'Dados inválidos.');
      return;
    }

    if (!editingPharmacy && ownerEmail && (!ownerName || !ownerPassword)) {
      setPharmacyError(
        'Para criar o utilizador inicial preencha Nome, Email e Password.',
      );
      return;
    }

    savePharmacyMutation.mutate();
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);

    const parsed = pharmacyUserSchema.safeParse({
      name: userName,
      email: userEmail,
      username: userUsername,
      role: userRole,
      password: userPassword,
    });

    if (!parsed.success) {
      setUserError(parsed.error.issues[0]?.message || 'Dados inválidos.');
      return;
    }

    if (!editingMember && !userPassword) {
      setUserError('A password é obrigatória ao criar um novo utilizador.');
      return;
    }

    saveUserMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Farmácias & Utilizadores
          </h2>
          <p className="text-xs text-slate-500">
            Gira todas as farmácias registadas, contas demo de 14 dias e os utilizadores de cada farmácia.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreatePharmacy}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Farmácia
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-3 px-4">Farmácia</th>
                <th className="py-3 px-4">NIF / Alvará</th>
                <th className="py-3 px-4">Estado / Demo</th>
                <th className="py-3 px-4">Subscrição</th>
                <th className="py-3 px-4">Utilizadores</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pharmacies.map((ph) => (
                <tr key={ph.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{ph.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {ph.batchesCount} lotes em inventário
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    <p>NIF: {ph.nif || '—'}</p>
                    <p className="text-slate-400">
                      Alvará: {ph.licenseNumber || '—'}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    {!ph.isDemo ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Ativa
                      </span>
                    ) : ph.isDemoExpired ? (
                      <div className="flex flex-col items-start gap-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          Demo Expirada
                        </span>
                        <button
                          type="button"
                          onClick={() => extendDemoMutation.mutate(ph.id)}
                          className="text-[11px] font-semibold text-emerald-600 hover:underline cursor-pointer"
                        >
                          Renovar +14 dias
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" />
                        Demo até{' '}
                        {ph.demoExpiresAt
                          ? new Date(ph.demoExpiresAt).toLocaleDateString('pt-PT')
                          : '—'}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    {ph.subscription ? (
                      <div>
                        <p className="font-semibold text-slate-800">
                          {ph.subscription.plan.name}
                        </p>
                        <p className="text-slate-500">
                          {ph.subscription.monthlyPrice.toFixed(2)} €/mês ·{' '}
                          {ph.subscription.status}
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-400">Sem plano</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => {
                        resetUserForm();
                        setManagingPharmacyId(ph.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-slate-600" />
                      {ph.membersCount} utilizador(es)
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => openEditPharmacy(ph)}
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
                            `Tem a certeza que deseja remover a farmácia "${ph.name}" e todos os seus dados?`,
                          )
                        ) {
                          deletePharmacyMutation.mutate(ph.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 text-xs font-medium text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar / Editar Farmácia */}
      {pharmacyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                {editingPharmacy ? 'Editar Farmácia' : 'Nova Farmácia'}
              </h3>
              <button
                type="button"
                onClick={() => setPharmacyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={handlePharmacySubmit}
              className="p-6 space-y-3.5 max-h-[80vh] overflow-y-auto"
            >
              {pharmacyError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {pharmacyError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome da Farmácia *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
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
                    placeholder="500000000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Alvará INFARMED
                  </label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="ALV-1234"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDemo}
                    onChange={(e) => setIsDemo(e.target.checked)}
                  />
                  Modo Demonstração (14 dias)
                </label>
                {isDemo && !editingPharmacy && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Dias de Demo
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={demoDays}
                      onChange={(e) => setDemoDays(Number(e.target.value))}
                      className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white"
                    />
                  </div>
                )}
              </div>

              {!editingPharmacy && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Plano de Subscrição (opcional)
                    </label>
                    <select
                      value={planId}
                      onChange={(e) => setPlanId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      <option value="">Sem plano atribuído</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.monthlyPrice.toFixed(2)} €/mês
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-700 mb-2">
                      Utilizador Administrador Inicial (opcional)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Nome completo"
                        className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
                      />
                      <input
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="Email"
                        className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
                      />
                      <input
                        type="text"
                        value={ownerUsername}
                        onChange={(e) => setOwnerUsername(e.target.value)}
                        placeholder="Username"
                        className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
                      />
                      <input
                        type="password"
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        placeholder="Password (min. 6)"
                        className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPharmacyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savePharmacyMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
                >
                  {savePharmacyMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Guardar Farmácia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gestão de Utilizadores da Farmácia */}
      {managingPharmacy && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">
                  Utilizadores — {managingPharmacy.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Criar, editar ou remover contas de acesso desta farmácia.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagingPharmacyId(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
              {/* Lista de Utilizadores */}
              <div className="space-y-2">
                {(managingPharmacy.members || []).length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">
                    Esta farmácia ainda não tem utilizadores.
                  </p>
                ) : (
                  (managingPharmacy.members || []).map((m) => (
                    <div
                      key={m.memberId}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {m.name}
                          </p>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            {m.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          {m.email} {m.username ? `· @${m.username}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMember(m);
                            setUserName(m.name);
                            setUserEmail(m.email);
                            setUserUsername(m.username || '');
                            setUserRole(m.role);
                            setUserPassword('');
                            setUserError(null);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                `Remover "${m.name}" da farmácia ${managingPharmacy.name}?`,
                              )
                            ) {
                              removeUserMutation.mutate({
                                pharmacyId: managingPharmacy.id,
                                userId: m.userId,
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-white text-xs font-medium text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remover
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Formulário Criar / Editar Utilizador */}
              <form
                onSubmit={handleUserSubmit}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                    {editingMember
                      ? `Editar: ${editingMember.name}`
                      : 'Adicionar Novo Utilizador à Farmácia'}
                  </h4>
                  {editingMember && (
                    <button
                      type="button"
                      onClick={resetUserForm}
                      className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Cancelar edição
                    </button>
                  )}
                </div>

                {userError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {userError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Nome completo *"
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="Email *"
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                  <input
                    type="text"
                    value={userUsername}
                    onChange={(e) => setUserUsername(e.target.value)}
                    placeholder="Username (opcional)"
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                  <select
                    value={userRole}
                    onChange={(e) =>
                      setUserRole(
                        e.target.value as 'owner' | 'admin' | 'member',
                      )
                    }
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="owner">owner (Dono / Diretor)</option>
                    <option value="admin">admin (Gestor)</option>
                    <option value="member">member (Farmacêutico)</option>
                  </select>
                </div>

                <input
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder={
                    editingMember
                      ? 'Nova password (deixe em branco para manter)'
                      : 'Password inicial (min. 6 caracteres) *'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saveUserMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    {saveUserMutation.isPending && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    {editingMember ? 'Guardar Alterações' : 'Criar Utilizador'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
