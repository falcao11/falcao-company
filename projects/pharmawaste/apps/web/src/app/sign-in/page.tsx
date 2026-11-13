'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { api, getApiErrorMessage } from '@/lib/api';
import {
  loginSchema,
  accountRequestSchema,
  LoginFormValues,
  AccountRequestFormValues,
} from '@/lib/schemas';
import {
  Lock,
  User,
  Building2,
  Mail,
  Phone,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'request'>('login');

  // Login state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginFieldErrors, setLoginFieldErrors] = useState<
    Partial<Record<keyof LoginFormValues, string>>
  >({});

  // Account Request state
  const [pharmacyName, setPharmacyName] = useState('');
  const [nif, setNif] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [requestFieldErrors, setRequestFieldErrors] = useState<
    Partial<Record<keyof AccountRequestFormValues, string>>
  >({});

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const result = values.identifier.includes('@')
        ? await authClient.signIn.email({
            email: values.identifier,
            password: values.password,
          })
        : await authClient.signIn.username({
            username: values.identifier,
            password: values.password,
          });

      if (result.error) {
        throw new Error(
          result.error.message ||
            'Credenciais inválidas. Verifique o email/username e a palavra-passe.',
        );
      }

      return result;
    },
    onSuccess: () => {
      router.push('/');
      router.refresh();
    },
  });

  const accountRequestMutation = useMutation({
    mutationFn: async (values: AccountRequestFormValues) => {
      return api.post('/account-requests', {
        pharmacyName: values.pharmacyName,
        nif: values.nif || undefined,
        licenseNumber: values.licenseNumber || undefined,
        contactName: values.contactName,
        email: values.email,
        phone: values.phone || undefined,
        notes: values.notes || undefined,
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginFieldErrors({});
    loginMutation.reset();

    const parsed = loginSchema.safeParse({ identifier, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setLoginFieldErrors({
        identifier: flat.identifier?.[0],
        password: flat.password?.[0],
      });
      return;
    }

    loginMutation.mutate(parsed.data);
  };

  const handleAccountRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestFieldErrors({});
    accountRequestMutation.reset();

    const parsed = accountRequestSchema.safeParse({
      pharmacyName,
      nif,
      licenseNumber,
      contactName,
      email,
      phone,
      notes,
    });

    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setRequestFieldErrors({
        pharmacyName: flat.pharmacyName?.[0],
        nif: flat.nif?.[0],
        licenseNumber: flat.licenseNumber?.[0],
        contactName: flat.contactName?.[0],
        email: flat.email?.[0],
        phone: flat.phone?.[0],
        notes: flat.notes?.[0],
      });
      return;
    }

    accountRequestMutation.mutate(parsed.data);
  };

  const resetRequestForm = () => {
    setPharmacyName('');
    setNif('');
    setLicenseNumber('');
    setContactName('');
    setEmail('');
    setPhone('');
    setNotes('');
    setRequestFieldErrors({});
    accountRequestMutation.reset();
    setMode('login');
  };

  const loginErrorMessage = loginMutation.error
    ? getApiErrorMessage(
        loginMutation.error,
        'Não foi possível iniciar sessão.',
      )
    : null;

  const requestErrorMessage = accountRequestMutation.error
    ? getApiErrorMessage(
        accountRequestMutation.error,
        'Erro ao enviar pedido de conta.',
      )
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/40 to-teal-50/60 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        {/* Header / Brand */}
        <div className="px-8 pt-8 pb-6 bg-white border-b border-slate-100 text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/logo.png"
              alt="PharmaWaste"
              className="h-12 w-auto object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {mode === 'login'
              ? 'Acesso ao Portal da Farmácia'
              : 'Pedir Conta PharmaWaste'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'login'
              ? 'Entre com as credenciais atribuídas à sua farmácia.'
              : 'Preencha os dados da sua farmácia para solicitar acesso.'}
          </p>
        </div>

        {/* Body */}
        <div className="p-8">
          {mode === 'login' ? (
            <form onSubmit={handleLogin} noValidate className="space-y-4">
              {loginErrorMessage && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{loginErrorMessage}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="identifier"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Email ou Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="farmacia@exemplo.pt ou farmlisboa"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-slate-900 text-sm focus:outline-none focus:ring-2 transition ${
                      loginFieldErrors.identifier
                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                    }`}
                  />
                </div>
                {loginFieldErrors.identifier && (
                  <p className="mt-1 text-xs text-rose-600">
                    {loginFieldErrors.identifier}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Palavra-passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-slate-900 text-sm focus:outline-none focus:ring-2 transition ${
                      loginFieldErrors.password
                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword
                        ? 'Ocultar palavra-passe'
                        : 'Mostrar palavra-passe'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {loginFieldErrors.password && (
                  <p className="mt-1 text-xs text-rose-600">
                    {loginFieldErrors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm shadow-sm shadow-emerald-600/20 transition cursor-pointer"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />A entrar...
                  </>
                ) : (
                  <>
                    Entrar na Plataforma
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-600">
                  Não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setLoginFieldErrors({});
                      loginMutation.reset();
                      setMode('request');
                    }}
                    className="font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2 cursor-pointer"
                  >
                    Peça a sua aqui
                  </button>
                </p>
              </div>
            </form>
          ) : accountRequestMutation.isSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Pedido enviado com sucesso!
                </h2>
                <p className="text-sm text-slate-600 mt-1.5">
                  Recebemos o pedido para a farmácia{' '}
                  <span className="font-semibold text-slate-800">
                    {pharmacyName}
                  </span>
                  . A nossa equipa irá analisar e enviar as credenciais de
                  acesso para <span className="font-medium">{email}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={resetRequestForm}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Login
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleAccountRequest}
              noValidate
              className="space-y-3.5"
            >
              {requestErrorMessage && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{requestErrorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome da Farmácia *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    placeholder="Ex: Farmácia Central de Lisboa"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                      requestFieldErrors.pharmacyName
                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                    }`}
                  />
                </div>
                {requestFieldErrors.pharmacyName && (
                  <p className="mt-1 text-xs text-rose-600">
                    {requestFieldErrors.pharmacyName}
                  </p>
                )}
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
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                      requestFieldErrors.nif
                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                    }`}
                  />
                  {requestFieldErrors.nif && (
                    <p className="mt-1 text-xs text-rose-600">
                      {requestFieldErrors.nif}
                    </p>
                  )}
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome do Responsável *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Dr. João Silva"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                      requestFieldErrors.contactName
                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                    }`}
                  />
                </div>
                {requestFieldErrors.contactName && (
                  <p className="mt-1 text-xs text-rose-600">
                    {requestFieldErrors.contactName}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="geral@farmacia.pt"
                      className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                        requestFieldErrors.email
                          ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                          : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  {requestFieldErrors.email && (
                    <p className="mt-1 text-xs text-rose-600">
                      {requestFieldErrors.email}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Telefone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="912 345 678"
                      className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                        requestFieldErrors.phone
                          ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                          : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  {requestFieldErrors.phone && (
                    <p className="mt-1 text-xs text-rose-600">
                      {requestFieldErrors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Observações (opcional)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Software de gestão atual (ex: Sifarma, Winphar) ou pedido de demo 14 dias..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={accountRequestMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm shadow-sm transition cursor-pointer"
              >
                {accountRequestMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />A enviar pedido...
                  </>
                ) : (
                  <>
                    Enviar Pedido de Conta
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setRequestFieldErrors({});
                    accountRequestMutation.reset();
                    setMode('login');
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Já tenho conta — voltar ao login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        PharmaWaste © {new Date().getFullYear()} Falcão Company — Gestão de
        Validades & Devoluções
      </p>
    </div>
  );
}
