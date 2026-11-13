'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { adminLoginSchema } from '@/lib/schemas';
import { getApiErrorMessage } from '@/lib/api';
import {
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function AdminSignInPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    identifier?: string;
    password?: string;
  }>({});

  const loginMutation = useMutation({
    mutationFn: async (values: { identifier: string; password: string }) => {
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
          result.error.message || 'Credenciais de administrador inválidas.',
        );
      }

      const userRole = (result.data?.user as { role?: string } | undefined)?.role;
      if (userRole !== 'admin') {
        await authClient.signOut();
        throw new Error(
          'Esta conta não tem permissões de administrador Falcão Company.',
        );
      }

      return result;
    },
    onSuccess: () => {
      router.push('/');
      router.refresh();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    loginMutation.reset();

    const parsed = adminLoginSchema.safeParse({ identifier, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        identifier: flat.identifier?.[0],
        password: flat.password?.[0],
      });
      return;
    }

    loginMutation.mutate(parsed.data);
  };

  const errorMessage = loginMutation.error
    ? getApiErrorMessage(loginMutation.error, 'Erro ao iniciar sessão.')
    : null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-8 pt-8 pb-6 border-b border-slate-100 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            PharmaWaste Admin
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Consola de Gestão — Falcão Company
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-8 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
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
                placeholder="falcaoadmin"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-slate-900 text-sm focus:outline-none focus:ring-2 transition ${
                  fieldErrors.identifier
                    ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                    : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
              />
            </div>
            {fieldErrors.identifier && (
              <p className="mt-1 text-xs text-rose-600">
                {fieldErrors.identifier}
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
                  fieldErrors.password
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-rose-600">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm shadow-sm transition cursor-pointer"
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />A autenticar...
              </>
            ) : (
              <>
                Entrar no Painel Admin
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
