import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://pharma_user:pharma_password_dev_123@localhost:5433/pharmawaste_db?schema=public';

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'farmaceutico@teste.pt' },
    update: {},
    create: {
      id: 'usr_test_1',
      name: 'Dr. Gonçalo Fonseca',
      email: 'farmaceutico@teste.pt',
      emailVerified: true,
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'farmacia-central-lisboa' },
    update: {},
    create: {
      id: 'org_test_1',
      name: 'Farmácia Central de Lisboa',
      slug: 'farmacia-central-lisboa',
      createdAt: new Date(),
    },
  });

  await prisma.member.upsert({
    where: { id: 'mem_test_1' },
    update: {},
    create: {
      id: 'mem_test_1',
      userId: user.id,
      organizationId: org.id,
      role: 'owner',
      createdAt: new Date(),
    },
  });

  console.log('✅ Seed executado com sucesso:');
  console.log({ userId: user.id, orgId: org.id, orgName: org.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
