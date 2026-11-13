'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Clock, Mail, LogOut, Loader2 } from 'lucide-react';

interface DemoExpiredScreenProps {
  organizationName: string;
  userEmail: string;
}

export function DemoExpiredScreen({
  organizationName,
  userEmail,
}: DemoExpiredScreenProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      router.push('/sign-in');
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-rose-50/40 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-amber-200/80 overflow-hidden">
        <div className="px-8 pt-8 pb-6 border-b border-slate-100 text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/logo.png"
              alt="PharmaWaste"
              className="h-11 w-auto object-contain"
            />
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Clock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            A sua conta de demonstração de 14 dias expirou
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            O período experimental para a{' '}
            <span className="font-semibold text-slate-800">
              {organizationName}
            </span>{' '}
            terminou.
          </p>
        </div>

        <div className="p-8 space-y-5">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 space-y-2">
            <p className="font-medium text-slate-900">
              Pretende continuar a utilizar o PharmaWaste?
            </p>
            <p className="text-slate-600">
              Os seus dados e histórico estão preservados. Entre em contacto com
              a equipa <strong>Falcão Company</strong> para ativar a subscrição
              da sua farmácia.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:comercial@falcaocompany.pt?subject=Ativa%C3%A7%C3%A3o%20de%20Conta%20PharmaWaste"
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition"
            >
              <Mail className="w-4 h-4" />
              Contactar Falcão Company
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm transition cursor-pointer disabled:opacity-60"
            >
              {isSigningOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              Terminar Sessão
            </button>
          </div>

          <p className="text-xs text-center text-slate-400">
            Sessão atual: {userEmail}
          </p>
        </div>
      </div>
    </div>
  );
}
