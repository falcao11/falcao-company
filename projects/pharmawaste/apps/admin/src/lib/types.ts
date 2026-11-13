export interface AdminDashboardData {
  kpis: {
    mrr: number;
    arr: number;
    activeSubscriptionsCount: number;
    totalPharmacies: number;
    activePharmacies: number;
    demoPharmacies: number;
    expiredDemoPharmacies: number;
    newPharmaciesLast30Days: number;
    totalUsers: number;
    newUsersLast30Days: number;
    pendingAccountRequests: number;
  };
  monthlySeries: Array<{
    month: string;
    newPharmacies: number;
    newUsers: number;
    revenue: number;
  }>;
  recentRequests: AccountRequestItem[];
}

export interface AccountRequestItem {
  id: string;
  pharmacyName: string;
  nif: string | null;
  licenseNumber: string | null;
  contactName: string;
  email: string;
  phone: string | null;
  notes: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface PharmacyMemberItem {
  memberId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  userId: string;
  name: string;
  email: string;
  username: string | null;
  createdAt: string;
}

export interface PharmacyItem {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  nif: string | null;
  licenseNumber: string | null;
  isDemo: boolean;
  demoExpiresAt: string | null;
  isDemoExpired: boolean;
  createdAt: string;
  membersCount: number;
  batchesCount: number;
  subscription: {
    id: string;
    status: string;
    monthlyPrice: number;
    planId: string;
    currentPeriodEnd: string | null;
    plan: { id: string; name: string };
  } | null;
  members?: PharmacyMemberItem[];
}

export interface SubscriptionPlanItem {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  maxUsers: number;
  maxBatches: number | null;
  isActive: boolean;
  _count?: { subscriptions: number };
}

export interface SubscriptionItem {
  id: string;
  organizationId: string;
  planId: string;
  status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELED';
  monthlyPrice: number;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  notes: string | null;
  organization: {
    id: string;
    name: string;
    isDemo: boolean;
    demoExpiresAt: string | null;
  };
  plan: SubscriptionPlanItem;
}
