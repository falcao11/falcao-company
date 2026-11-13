import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { hashPassword } from 'better-auth/crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://pharma_user:pharma_password_dev_123@localhost:5433/pharmawaste_db?schema=public';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function ensurePharmacyAccount(params: {
  orgId: string;
  orgName: string;
  orgSlug: string;
  nif: string;
  licenseNumber: string;
  isDemo: boolean;
  demoExpiresAt: Date | null;
  userId: string;
  userName: string;
  email: string;
  username: string;
  passwordPlain: string;
}) {
  const passwordHash = await hashPassword(params.passwordPlain);

  const metadataJson = JSON.stringify({
    nif: params.nif,
    licenseNumber: params.licenseNumber,
  });

  const org = await prisma.organization.upsert({
    where: { slug: params.orgSlug },
    update: {
      name: params.orgName,
      metadata: metadataJson,
      isDemo: params.isDemo,
      demoExpiresAt: params.demoExpiresAt,
    },
    create: {
      id: params.orgId,
      name: params.orgName,
      slug: params.orgSlug,
      metadata: metadataJson,
      isDemo: params.isDemo,
      demoExpiresAt: params.demoExpiresAt,
      createdAt: new Date(),
    },
  });

  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {
      name: params.userName,
      username: params.username,
      displayUsername: params.username,
      emailVerified: true,
    },
    create: {
      id: params.userId,
      name: params.userName,
      email: params.email,
      username: params.username,
      displayUsername: params.username,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const existingAccount = await prisma.account.findFirst({
    where: {
      userId: user.id,
      providerId: 'credential',
    },
  });

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: passwordHash, updatedAt: new Date() },
    });
  } else {
    await prisma.account.create({
      data: {
        id: `acc_${user.id}`,
        accountId: user.id,
        providerId: 'credential',
        userId: user.id,
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  const existingMember = await prisma.member.findFirst({
    where: {
      organizationId: org.id,
      userId: user.id,
    },
  });

  if (!existingMember) {
    await prisma.member.create({
      data: {
        id: `mem_${org.id}_${user.id}`,
        organizationId: org.id,
        userId: user.id,
        role: 'owner',
        createdAt: new Date(),
      },
    });
  }

  return { org, user };
}

async function main() {
  // 1. Farmácia Ativa (sem expiração demo)
  await ensurePharmacyAccount({
    orgId: 'org_lisboa_1',
    orgName: 'Farmácia Central de Lisboa',
    orgSlug: 'farmacia-central-lisboa',
    nif: '501234567',
    licenseNumber: 'ALV-1234-INFARMED',
    isDemo: false,
    demoExpiresAt: null,
    userId: 'usr_lisboa_1',
    userName: 'Dr. Gonçalo Fonseca',
    email: 'farmacia.lisboa@pharmawaste.pt',
    username: 'farmlisboa',
    passwordPlain: 'Pharma2026!',
  });

  // 2. Farmácia Demo Expirada (14 dias já terminados)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await ensurePharmacyAccount({
    orgId: 'org_demo_porto_1',
    orgName: 'Farmácia Demo Porto',
    orgSlug: 'farmacia-demo-porto',
    nif: '509876543',
    licenseNumber: 'ALV-9999-DEMO',
    isDemo: true,
    demoExpiresAt: yesterday,
    userId: 'usr_demo_porto_1',
    userName: 'Dra. Maria Demo',
    email: 'demo.expirada@pharmawaste.pt',
    username: 'demoexpirada',
    passwordPlain: 'Pharma2026!',
  });

  // 3. Super Admin Falcão Company (role: 'admin')
  const adminHash = await hashPassword('Admin2026!');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@falcaocompany.pt' },
    update: {
      name: 'Gonçalo Fonseca (Admin)',
      username: 'falcaoadmin',
      displayUsername: 'falcaoadmin',
      role: 'admin',
      emailVerified: true,
    },
    create: {
      id: 'usr_super_admin_1',
      name: 'Gonçalo Fonseca (Admin)',
      email: 'admin@falcaocompany.pt',
      username: 'falcaoadmin',
      displayUsername: 'falcaoadmin',
      role: 'admin',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const existingAdminAcc = await prisma.account.findFirst({
    where: { userId: adminUser.id, providerId: 'credential' },
  });
  if (existingAdminAcc) {
    await prisma.account.update({
      where: { id: existingAdminAcc.id },
      data: { password: adminHash, updatedAt: new Date() },
    });
  } else {
    await prisma.account.create({
      data: {
        id: `acc_${adminUser.id}`,
        accountId: adminUser.id,
        providerId: 'credential',
        userId: adminUser.id,
        password: adminHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // 4. Planos de Subscrição Padrão
  const starterPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Starter' },
    update: { monthlyPrice: 49, maxUsers: 3, maxBatches: 1000, isActive: true },
    create: {
      name: 'Starter',
      description: 'Ideal para farmácias independentes até 3 utilizadores.',
      monthlyPrice: 49,
      maxUsers: 3,
      maxBatches: 1000,
      isActive: true,
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Profissional' },
    update: { monthlyPrice: 99, maxUsers: 10, maxBatches: null, isActive: true },
    create: {
      name: 'Profissional',
      description: 'Controlo completo de validades, guias PDF e lotes ilimitados.',
      monthlyPrice: 99,
      maxUsers: 10,
      maxBatches: null,
      isActive: true,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { name: 'Grupo Farmacêutico' },
    update: { monthlyPrice: 199, maxUsers: 50, maxBatches: null, isActive: true },
    create: {
      name: 'Grupo Farmacêutico',
      description: 'Para grupos com múltiplas farmácias e equipa alargada.',
      monthlyPrice: 199,
      maxUsers: 50,
      maxBatches: null,
      isActive: true,
    },
  });

  // Associar subscrição ativa à Farmácia Central de Lisboa
  const lisboaOrg = await prisma.organization.findUnique({
    where: { slug: 'farmacia-central-lisboa' },
  });
  if (lisboaOrg) {
    await prisma.subscription.upsert({
      where: { organizationId: lisboaOrg.id },
      update: { planId: proPlan.id, status: 'ACTIVE', monthlyPrice: proPlan.monthlyPrice },
      create: {
        organizationId: lisboaOrg.id,
        planId: proPlan.id,
        status: 'ACTIVE',
        monthlyPrice: proPlan.monthlyPrice,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('✅ Contas, planos e subscrições iniciais prontos:');
  console.log('   1) Super Admin: falcaoadmin / admin@falcaocompany.pt | pass: Admin2026!');
  console.log('   2) Farmácia Ativa: farmlisboa / farmacia.lisboa@pharmawaste.pt | pass: Pharma2026!');
  console.log('   3) Demo Expirada: demoexpirada / demo.expirada@pharmawaste.pt | pass: Pharma2026!');
  console.log(`   4) Planos: ${starterPlan.name} (49€), ${proPlan.name} (99€), Grupo Farmacêutico (199€)`);
}

main()
  .catch((err) => {
    console.error('❌ Erro no seed de autenticação:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
