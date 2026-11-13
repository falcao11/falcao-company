'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { api, API_ORIGIN, API_PUBLIC_URL, getApiErrorMessage } from '@/lib/api';
import {
  UploadCloud,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  Search,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  Trash2,
  LogOut,
} from 'lucide-react';

export interface BatchItem {
  id: string;
  cnp: string;
  name: string;
  batchNumber: string;
  expirationDate: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplier?: string;
  riskStatus: 'CRITICAL' | 'WARNING' | 'EXPIRED' | 'HEALTHY' | 'RETURNED';
  returnRequestId?: string | null;
}

export interface SummaryData {
  totalBatches: number;
  totalValueAtRisk: number;
  breakdown: {
    critical: { count: number; value: number };
    warning: { count: number; value: number };
    expired: { count: number; value: number };
    healthy: { count: number };
  };
}

export interface UserContext {
  id: string;
  name: string;
  email: string;
}

export interface OrganizationContext {
  id: string;
  name: string;
  logo: string | null;
  nif: string | null;
  licenseNumber: string | null;
  primaryColor: string;
  isDemo: boolean;
  demoExpiresAt: string | null;
  isDemoExpired: boolean;
}

interface InventoryDashboardProps {
  initialSummary: SummaryData | null;
  initialBatches: BatchItem[];
  user: UserContext;
  organization: OrganizationContext;
}

export function InventoryDashboard({
  initialSummary,
  initialBatches,
  user,
  organization,
}: InventoryDashboardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [lastPdfUrl, setLastPdfUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // TanStack Query populado com initialData do Server Component (ZERO useEffect!)
  const { data: summary = null } = useQuery({
    queryKey: ['inventory', 'summary'],
    queryFn: () => api.get<SummaryData>('/summary'),
    initialData: initialSummary,
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['inventory', 'batches'],
    queryFn: async () => {
      const res = await api.get<{ items?: BatchItem[]; data?: BatchItem[] }>(
        '/batches?limit=100'
      );
      return res.items || res.data || [];
    },
    initialData: initialBatches,
  });

  const initials =
    user.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'PW';

  const signOutMutation = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      queryClient.clear();
      router.push('/sign-in');
      router.refresh();
    },
  });

  const returnBatchMutation = useMutation({
    mutationFn: (batch: BatchItem) =>
      api.post<{ pdfUrl: string; totalValue: number }>('/returns', {
        batchIds: [batch.id],
      }),
    onSuccess: (data, batch) => {
      const fullPdfUrl = `${API_ORIGIN}${data.pdfUrl}`;
      setLastPdfUrl(fullPdfUrl);
      setUploadSuccess(
        `Guia de devolução gerada para ${batch.name} (${batch.batchNumber})! Valor a creditar: ${data.totalValue.toFixed(2)} €.`
      );
      window.open(fullPdfUrl, '_blank');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => {
      alert(getApiErrorMessage(err, 'Erro ao gerar guia de devolução.'));
    },
  });

  const clearInventoryMutation = useMutation({
    mutationFn: () => api.delete('/batches'),
    onSuccess: () => {
      queryClient.setQueryData(['inventory', 'summary'], null);
      queryClient.setQueryData(['inventory', 'batches'], []);
      setUploadSuccess(
        'Inventário limpo com sucesso. Todos os valores foram repostos a 0.00 €.'
      );
    },
    onError: (err) => {
      alert(getApiErrorMessage(err, 'Erro ao limpar inventário.'));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post<{
        totalItems: number;
        createdCount: number;
        updatedCount: number;
        deletedCount: number;
        totalValueAtRisk: number;
      }>('/upload', formData);
    },
    onSuccess: (data) => {
      setUploadSuccess(
        `Inventário sincronizado: ${data.totalItems} lotes (${data.createdCount} novos, ${data.updatedCount} atualizados, ${data.deletedCount} removidos). Risco detetado: ${data.totalValueAtRisk} €.`
      );
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => {
      alert(getApiErrorMessage(err, 'Erro ao enviar ficheiro.'));
    },
  });

  const isUploading = uploadMutation.isPending;
  const isClearing = clearInventoryMutation.isPending;
  const isSigningOut = signOutMutation.isPending;
  const returningBatchId = returnBatchMutation.isPending
    ? returnBatchMutation.variables?.id ?? null
    : null;

  const handleSignOut = () => {
    signOutMutation.mutate();
  };

  const handleReturnBatch = (batch: BatchItem) => {
    setUploadSuccess(null);
    setLastPdfUrl(null);
    returnBatchMutation.mutate(batch);
  };

  const handleClearInventory = () => {
    setUploadSuccess(null);
    clearInventoryMutation.mutate();
  };

  // Atualização disparada estritamente por EVENTO (onDrop), sem efeitos secundários
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setUploadSuccess(null);
      uploadMutation.mutate(acceptedFiles[0]);
    },
    [uploadMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  // Cálculo derivado puro durante a renderização (sem necessidade de useEffect)
  const filteredBatches = batches.filter((b) => {
    const matchesFilter = activeFilter === 'ALL' || b.riskStatus === activeFilter;
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.cnp.includes(searchQuery) ||
      b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. HEADER INSTITUCIONAL */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="PharmaWaste Logo"
              width={56}
              height={46}
              className="h-11 w-auto object-contain"
              priority
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">PharmaWaste</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  MVP v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500">Gestão Preditiva de Validades</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {organization.isDemo && (
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3 h-3" />
                Demo 14 dias
              </span>
            )}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs text-slate-700 border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium">{organization.name}</span>
              {(organization.licenseNumber || organization.nif) && (
                <>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500">
                    {organization.licenseNumber || `NIF ${organization.nif}`}
                  </span>
                </>
              )}
            </div>
            <div
              title={`${user.name} (${user.email})`}
              className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 border border-slate-300"
            >
              {initials}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              title="Terminar Sessão"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer disabled:opacity-60"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Diagnóstico e Recuperação de Stock
          </h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">
            Identifique caixas a expirar nas gavetas e automatize pedidos de devolução aos laboratórios antes do prazo legal.
          </p>
        </div>

        {/* DROPZONE */}
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer bg-white ${
            isDragActive
              ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50/50 shadow-sm'
          }`}
        >
          <input {...getInputProps()} />
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-4">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {isDragActive
                ? 'Solte o ficheiro de inventário aqui...'
                : 'Arraste o extrato de stock da sua farmácia aqui'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Compatível com exportações Excel e CSV do <strong>Sifarma</strong>, <strong>Glintt</strong>, FarmaControl ou genérico.
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Formatos aceites: .xlsx, .xls, .csv (até 25MB)</span>
            </div>

            {isUploading && (
              <div className="mt-4 flex items-center gap-2 text-emerald-600 font-medium text-sm animate-pulse">
                <Clock className="w-4 h-4 animate-spin" />
                <span>A processar lotes e a calcular semáforos de validade...</span>
              </div>
            )}
          </div>
        </div>

        {uploadSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
            {lastPdfUrl && (
              <a
                href={lastPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                <span>Descarregar Guia PDF</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* 3. CARTÕES DE MÉTRICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Valor Total em Risco
              </span>
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {summary ? summary.totalValueAtRisk.toFixed(2) : '0.00'} €
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Recuperável em devoluções a tempo.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm bg-gradient-to-br from-white to-red-50/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                Crítico (&lt; 60 dias)
              </span>
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-red-700">
                {summary?.breakdown?.critical?.value?.toFixed(2) || '0.00'} €
              </span>
              <span className="text-xs font-semibold text-red-600">
                ({summary?.breakdown?.critical?.count ?? 0} lotes)
              </span>
            </div>
            <p className="text-xs text-red-600/80 mt-1">Ação urgente de devolução necessária.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Alerta (60 a 90 dias)
              </span>
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-800">
                {summary?.breakdown?.warning?.value?.toFixed(2) || '0.00'} €
              </span>
              <span className="text-xs font-semibold text-amber-700">
                ({summary?.breakdown?.warning?.count ?? 0} lotes)
              </span>
            </div>
            <p className="text-xs text-amber-700/80 mt-1">Priorizar em balcão (sistema FEFO).</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Expirado
              </span>
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-700">
                {summary?.breakdown?.expired?.value?.toFixed(2) || '0.00'} €
              </span>
              <span className="text-xs font-semibold text-slate-500">
                ({summary?.breakdown?.expired?.count ?? 0} lotes)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Preparar para recolha/incineração.</p>
          </div>
        </div>

        {/* 4. TABELA DE LOTES */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: 'ALL', label: 'Todos os Lotes' },
                { key: 'CRITICAL', label: '🔴 Críticos' },
                { key: 'WARNING', label: '🟡 Alerta' },
                { key: 'EXPIRED', label: '⚫ Expirados' },
                { key: 'HEALTHY', label: '🟢 Saudáveis' },
                { key: 'RETURNED', label: '📦 Devolvidos' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeFilter === tab.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar medicamento ou CNP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {batches.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearInventory}
                  disabled={isClearing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isClearing ? 'A limpar...' : 'Limpar Dados'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">CNP</th>
                  <th className="py-3 px-4">Medicamento / Designação</th>
                  <th className="py-3 px-4">Lote</th>
                  <th className="py-3 px-4">Data Validade</th>
                  <th className="py-3 px-4">Quantidade</th>
                  <th className="py-3 px-4">Custo Total</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatches.length > 0 ? (
                  filteredBatches.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                        {item.cnp}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {item.name}
                        {item.supplier && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Fornecedor: {item.supplier}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{item.batchNumber}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {new Date(item.expirationDate).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{item.quantity} un.</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {item.totalCost.toFixed(2)} €
                      </td>
                      <td className="py-3.5 px-4">
                        {item.riskStatus === 'CRITICAL' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                            Crítico (&lt;60d)
                          </span>
                        )}
                        {item.riskStatus === 'WARNING' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            Alerta (90d)
                          </span>
                        )}
                        {item.riskStatus === 'EXPIRED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px]">
                            Expirado
                          </span>
                        )}
                        {item.riskStatus === 'HEALTHY' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Saudável
                          </span>
                        )}
                        {item.riskStatus === 'RETURNED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                            Devolvido
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {(item.riskStatus === 'CRITICAL' ||
                          item.riskStatus === 'WARNING' ||
                          item.riskStatus === 'EXPIRED') && (
                          <button
                            type="button"
                            onClick={() => handleReturnBatch(item)}
                            disabled={returningBatchId === item.id}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <span>
                              {returningBatchId === item.id ? 'A gerar PDF...' : 'Devolver'}
                            </span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                        {item.riskStatus === 'RETURNED' && item.returnRequestId && (
                          <a
                            href={`${API_PUBLIC_URL}/returns/${item.returnRequestId}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <span>Guia PDF</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Nenhum lote encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          PharmaWaste © 2026 • Produto desenvolvido por Falcão Company.
        </div>
      </footer>
    </div>
  );
}
