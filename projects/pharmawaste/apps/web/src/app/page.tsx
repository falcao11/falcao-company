import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { InventoryDashboard, BatchItem, SummaryData } from '@/components/InventoryDashboard';
import { DemoExpiredScreen } from '@/components/DemoExpiredScreen';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface ContextResponse {
  user: { id: string; name: string; email: string };
  organization: {
    id: string;
    name: string;
    logo: string | null;
    nif: string | null;
    licenseNumber: string | null;
    primaryColor: string;
    isDemo: boolean;
    demoExpiresAt: string | null;
    isDemoExpired: boolean;
  };
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    redirect('/sign-in');
  }

  let context: ContextResponse | null = null;

  try {
    context = await api.get<ContextResponse>('/context', {
      headers: { Cookie: cookieHeader },
    });
  } catch {
    context = null;
  }

  if (!context) {
    redirect('/sign-in');
  }

  if (context.organization.isDemoExpired) {
    return (
      <DemoExpiredScreen
        organizationName={context.organization.name}
        userEmail={context.user.email}
      />
    );
  }

  let initialSummary: SummaryData | null = null;
  let initialBatches: BatchItem[] = [];

  try {
    const [summaryData, batchesData] = await Promise.all([
      api.get<SummaryData>('/summary', {
        headers: { Cookie: cookieHeader },
      }),
      api.get<{ items?: BatchItem[]; data?: BatchItem[] }>('/batches?limit=100', {
        headers: { Cookie: cookieHeader },
      }),
    ]);

    initialSummary = summaryData;
    initialBatches = batchesData.items || batchesData.data || [];
  } catch (err) {
    console.error('Failed to fetch initial inventory data:', err);
  }

  return (
    <InventoryDashboard
      initialSummary={initialSummary}
      initialBatches={initialBatches}
      user={context.user}
      organization={context.organization}
    />
  );
}
