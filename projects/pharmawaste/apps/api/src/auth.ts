import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, bearer, admin, username } from "better-auth/plugins";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://pharma_user:pharma_password_dev_123@localhost:5433/pharmawaste_db?schema=public";

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // Onboarding B2B fechado: contas criadas apenas pelo Admin Falcão Company
  },
  plugins: [
    username(),     // Permite login por Email ou Username
    organization(), // Multi-tenancy: farmácias, convites e gestão de membros
    bearer(),       // Suporte a cabeçalho Authorization: Bearer <token>
    admin(),        // Super Admin para a Falcão Company gerir todas as instâncias
  ],
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // Associa automaticamente a farmácia do utilizador no momento do login
          const membership = await prisma.member.findFirst({
            where: { userId: session.userId },
            orderBy: { createdAt: "asc" },
          });

          return {
            data: {
              ...session,
              activeOrganizationId: membership?.organizationId ?? null,
            },
          };
        },
      },
    },
  },
});
