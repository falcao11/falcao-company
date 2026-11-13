import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminApi, ApiError } from '@/lib/api';
import {
  AccountRequestItem,
  AdminDashboardData,
  PharmacyItem,
  SubscriptionItem,
  SubscriptionPlanItem,
} from '@/lib/types';
import { AdminShell } from '@/components/AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    redirect('/sign-in');
  }

  let initialDashboard: AdminDashboardData | null = null;
  let isForbidden = false;
  let isUnauthorized = false;

  try {
    initialDashboard = await adminApi.get<AdminDashboardData>('/dashboard', {
      headers: { Cookie: cookieHeader },
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      isForbidden = true;
    } else {
      isUnauthorized = true;
    }
  }

  if (isUnauthorized) {
    redirect('/sign-in');
  }

  if (isForbidden || !initialDashboard) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-2xl space-y-4">
          <h1 className="text-xl font-bold text-slate-900">
            Acesso Restrito
          </h1>
          <p className="text-sm text-slate-600">
            Esta área é exclusiva a administradores da Falcão Company.
          </p>
          <a
            href="/sign-in"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
          >
            Entrar com conta Admin
          </a>
        </div>
      </div>
    );
  }

  const [initialPharmacies, initialRequests, initialPlans, initialSubscriptions] =
    await Promise.all([
      adminApi.get<PharmacyItem[]>('/pharmacies', {
        headers: { Cookie: cookieHeader },
      }),
      adminApi.get<AccountRequestItem[]>('/account-requests', {
        headers: { Cookie: cookieHeader },
      }),
      adminApi.get<SubscriptionPlanItem[]>('/plans', {
        headers: { Cookie: cookieHeader },
      }),
      adminApi.get<SubscriptionItem[]>('/subscriptions', {
        headers: { Cookie: cookieHeader },
      }),
    ]);

  return (
    <AdminShell
      initialDashboard={initialDashboard}
      initialPharmacies={initialPharmacies}
      initialRequests={initialRequests}
      initialPlans={initialPlans}
      initialSubscriptions={initialSubscriptions}
    />
  );
}
