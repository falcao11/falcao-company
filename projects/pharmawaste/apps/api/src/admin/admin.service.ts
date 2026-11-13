import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from 'better-auth/crypto';
import * as crypto from 'crypto';
import {
  ApproveAccountRequestDto,
  CreatePharmacyDto,
  CreatePharmacyUserDto,
  CreatePlanDto,
  UpdateAccountRequestStatusDto,
  UpdatePharmacyDto,
  UpdatePharmacyUserDto,
  UpdatePlanDto,
  UpdateSubscriptionDto,
  UpsertSubscriptionDto,
} from './dto/admin.dto';

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function parseOrgMetadata(metadata: string | null): {
  nif: string | null;
  licenseNumber: string | null;
} {
  if (!metadata) return { nif: null, licenseNumber: null };
  try {
    const parsed = JSON.parse(metadata) as {
      nif?: string | null;
      licenseNumber?: string | null;
    };
    return {
      nif: parsed.nif ?? null,
      licenseNumber: parsed.licenseNumber ?? null,
    };
  } catch {
    return { nif: null, licenseNumber: null };
  }
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // 1. DASHBOARD METRICS (SaaS Analytics)
  // =========================================================================
  async getDashboard() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [orgs, users, subscriptions, pendingRequests, recentRequests] =
      await Promise.all([
        this.prisma.organization.findMany({
          select: {
            id: true,
            name: true,
            isDemo: true,
            demoExpiresAt: true,
            createdAt: true,
          },
        }),
        this.prisma.user.findMany({
          where: { role: { not: 'admin' } },
          select: { id: true, createdAt: true },
        }),
        this.prisma.subscription.findMany({
          include: { plan: { select: { name: true } } },
        }),
        this.prisma.accountRequest.count({ where: { status: 'PENDING' } }),
        this.prisma.accountRequest.findMany({
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === 'ACTIVE',
    );
    const mrr = Number(
      activeSubscriptions.reduce((sum, s) => sum + s.monthlyPrice, 0).toFixed(2),
    );
    const arr = Number((mrr * 12).toFixed(2));

    const expiredDemoPharmacies = orgs.filter(
      (o) => o.isDemo && o.demoExpiresAt && o.demoExpiresAt <= now,
    ).length;
    const demoPharmacies = orgs.filter(
      (o) => o.isDemo && (!o.demoExpiresAt || o.demoExpiresAt > now),
    ).length;
    const activePharmacies = orgs.filter((o) => !o.isDemo).length;
    const newPharmaciesLast30Days = orgs.filter(
      (o) => o.createdAt >= thirtyDaysAgo,
    ).length;
    const newUsersLast30Days = users.filter(
      (u) => u.createdAt >= thirtyDaysAgo,
    ).length;

    // Evolução dos últimos 6 meses
    const monthNames = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];
    const monthlySeries = Array.from({ length: 6 }, (_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const monthPharmacies = orgs.filter(
        (o) => o.createdAt >= d && o.createdAt < nextMonth,
      ).length;
      const monthUsers = users.filter(
        (u) => u.createdAt >= d && u.createdAt < nextMonth,
      ).length;
      const monthRevenue = Number(
        activeSubscriptions
          .filter((s) => s.createdAt < nextMonth)
          .reduce((sum, s) => sum + s.monthlyPrice, 0)
          .toFixed(2),
      );

      return {
        month: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
        newPharmacies: monthPharmacies,
        newUsers: monthUsers,
        revenue: monthRevenue,
      };
    });

    return {
      kpis: {
        mrr,
        arr,
        activeSubscriptionsCount: activeSubscriptions.length,
        totalPharmacies: orgs.length,
        activePharmacies,
        demoPharmacies,
        expiredDemoPharmacies,
        newPharmaciesLast30Days,
        totalUsers: users.length,
        newUsersLast30Days,
        pendingAccountRequests: pendingRequests,
      },
      monthlySeries,
      recentRequests,
    };
  }

  // =========================================================================
  // 2. ACCOUNT REQUESTS
  // =========================================================================
  async listAccountRequests(status?: string) {
    return this.prisma.accountRequest.findMany({
      where: status && status !== 'ALL' ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAccountRequestStatus(
    id: string,
    dto: UpdateAccountRequestStatusDto,
  ) {
    const existing = await this.prisma.accountRequest.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Pedido de conta não encontrado.');
    }
    return this.prisma.accountRequest.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async approveAccountRequest(id: string, dto: ApproveAccountRequestDto) {
    const req = await this.prisma.accountRequest.findUnique({ where: { id } });
    if (!req) {
      throw new NotFoundException('Pedido de conta não encontrado.');
    }

    const pharmacy = await this.createPharmacy({
      name: dto.pharmacyName?.trim() || req.pharmacyName,
      nif: dto.nif?.trim() || req.nif || undefined,
      licenseNumber: dto.licenseNumber?.trim() || req.licenseNumber || undefined,
      isDemo: dto.isDemo ?? false,
      demoDays: dto.demoDays ?? 14,
      planId: dto.planId,
      ownerName: dto.ownerName,
      ownerEmail: dto.ownerEmail,
      ownerUsername: dto.ownerUsername,
      ownerPassword: dto.ownerPassword,
    });

    await this.prisma.accountRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    return pharmacy;
  }

  // =========================================================================
  // 3. PHARMACIES & MEMBERS CRUD
  // =========================================================================
  private formatPharmacy(org: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    metadata: string | null;
    isDemo: boolean;
    demoExpiresAt: Date | null;
    createdAt: Date;
    subscription?: {
      id: string;
      status: string;
      monthlyPrice: number;
      planId: string;
      currentPeriodEnd: Date | null;
      plan: { id: string; name: string };
    } | null;
    members?: Array<{
      id: string;
      role: string;
      createdAt: Date;
      user: {
        id: string;
        name: string;
        email: string;
        username: string | null;
        createdAt: Date;
      };
    }>;
    _count?: { members: number; batches: number };
  }) {
    const now = new Date();
    const { nif, licenseNumber } = parseOrgMetadata(org.metadata);
    const isDemoExpired = Boolean(
      org.isDemo && org.demoExpiresAt && org.demoExpiresAt <= now,
    );

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      nif,
      licenseNumber,
      isDemo: org.isDemo,
      demoExpiresAt: org.demoExpiresAt,
      isDemoExpired,
      createdAt: org.createdAt,
      subscription: org.subscription ?? null,
      membersCount: org._count?.members ?? org.members?.length ?? 0,
      batchesCount: org._count?.batches ?? 0,
      members: org.members?.map((m) => ({
        memberId: m.id,
        role: m.role,
        joinedAt: m.createdAt,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        username: m.user.username,
        createdAt: m.user.createdAt,
      })),
    };
  }

  async listPharmacies() {
    const orgs = await this.prisma.organization.findMany({
      include: {
        subscription: {
          include: { plan: { select: { id: true, name: true } } },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { members: true, batches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orgs.map((org) => this.formatPharmacy(org));
  }

  async getPharmacy(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        subscription: {
          include: { plan: { select: { id: true, name: true } } },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { members: true, batches: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Farmácia não encontrada.');
    }

    return this.formatPharmacy(org);
  }

  async createPharmacy(dto: CreatePharmacyDto) {
    const baseSlug = slugify(dto.name) || 'farmacia';
    const existingSlug = await this.prisma.organization.findUnique({
      where: { slug: baseSlug },
    });
    const slug = existingSlug
      ? `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`
      : baseSlug;

    if (dto.ownerEmail) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.ownerEmail.trim().toLowerCase() },
      });
      if (existingEmail) {
        throw new ConflictException(
          'Já existe um utilizador registado com este email.',
        );
      }
    }

    if (dto.ownerUsername) {
      const existingUsername = await this.prisma.user.findUnique({
        where: { username: dto.ownerUsername.trim().toLowerCase() },
      });
      if (existingUsername) {
        throw new ConflictException('Este username já está em uso.');
      }
    }

    let plan: { id: string; monthlyPrice: number } | null = null;
    if (dto.planId) {
      plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: dto.planId },
        select: { id: true, monthlyPrice: true },
      });
      if (!plan) {
        throw new NotFoundException('Plano de subscrição não encontrado.');
      }
    }

    const demoExpiresAt = dto.isDemo
      ? new Date(Date.now() + (dto.demoDays ?? 14) * 24 * 60 * 60 * 1000)
      : null;

    const ownerHash = dto.ownerPassword
      ? await hashPassword(dto.ownerPassword)
      : null;

    const createdOrgId = await this.prisma.$transaction(async (tx) => {
      const orgId = `org_${crypto.randomUUID().slice(0, 12)}`;
      const org = await tx.organization.create({
        data: {
          id: orgId,
          name: dto.name.trim(),
          slug,
          metadata: JSON.stringify({
            nif: dto.nif?.trim() || null,
            licenseNumber: dto.licenseNumber?.trim() || null,
          }),
          isDemo: Boolean(dto.isDemo),
          demoExpiresAt,
          createdAt: new Date(),
        },
      });

      if (dto.ownerEmail && dto.ownerName && ownerHash) {
        const userId = `usr_${crypto.randomUUID().slice(0, 12)}`;
        const normalizedUsername = dto.ownerUsername?.trim().toLowerCase() || null;

        await tx.user.create({
          data: {
            id: userId,
            name: dto.ownerName.trim(),
            email: dto.ownerEmail.trim().toLowerCase(),
            username: normalizedUsername,
            displayUsername: normalizedUsername,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        await tx.account.create({
          data: {
            id: `acc_${userId}`,
            accountId: userId,
            providerId: 'credential',
            userId,
            password: ownerHash,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        await tx.member.create({
          data: {
            id: `mem_${org.id}_${userId}`,
            organizationId: org.id,
            userId,
            role: 'owner',
            createdAt: new Date(),
          },
        });
      }

      if (plan) {
        await tx.subscription.create({
          data: {
            organizationId: org.id,
            planId: plan.id,
            status: dto.isDemo ? 'TRIAL' : 'ACTIVE',
            monthlyPrice: plan.monthlyPrice,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ),
          },
        });
      }

      return org.id;
    });

    return this.getPharmacy(createdOrgId);
  }

  async updatePharmacy(id: string, dto: UpdatePharmacyDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Farmácia não encontrada.');
    }

    const currentMeta = parseOrgMetadata(existing.metadata);
    const nextMeta = {
      nif: dto.nif !== undefined ? dto.nif.trim() || null : currentMeta.nif,
      licenseNumber:
        dto.licenseNumber !== undefined
          ? dto.licenseNumber.trim() || null
          : currentMeta.licenseNumber,
    };

    const nextIsDemo = dto.isDemo !== undefined ? dto.isDemo : existing.isDemo;
    let nextDemoExpiresAt = existing.demoExpiresAt;
    if (dto.demoExpiresAt !== undefined) {
      nextDemoExpiresAt = dto.demoExpiresAt ? new Date(dto.demoExpiresAt) : null;
    } else if (dto.isDemo === true && !existing.demoExpiresAt) {
      nextDemoExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    } else if (dto.isDemo === false) {
      nextDemoExpiresAt = null;
    }

    await this.prisma.organization.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : existing.name,
        metadata: JSON.stringify(nextMeta),
        isDemo: nextIsDemo,
        demoExpiresAt: nextDemoExpiresAt,
      },
    });

    return this.getPharmacy(id);
  }

  async deletePharmacy(id: string) {
    const existing = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Farmácia não encontrada.');
    }
    await this.prisma.organization.delete({ where: { id } });
    return { deleted: true, id };
  }

  // =========================================================================
  // 4. PHARMACY USERS CRUD
  // =========================================================================
  async createPharmacyUser(pharmacyId: string, dto: CreatePharmacyUserDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id: pharmacyId },
    });
    if (!org) {
      throw new NotFoundException('Farmácia não encontrada.');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedUsername = dto.username?.trim().toLowerCase() || null;

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      throw new ConflictException('Já existe um utilizador com este email.');
    }

    if (normalizedUsername) {
      const existingUsername = await this.prisma.user.findUnique({
        where: { username: normalizedUsername },
      });
      if (existingUsername) {
        throw new ConflictException('Este username já está em uso.');
      }
    }

    const passwordHash = await hashPassword(dto.password);

    await this.prisma.$transaction(async (tx) => {
      const userId = `usr_${crypto.randomUUID().slice(0, 12)}`;
      await tx.user.create({
        data: {
          id: userId,
          name: dto.name.trim(),
          email: normalizedEmail,
          username: normalizedUsername,
          displayUsername: normalizedUsername,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await tx.account.create({
        data: {
          id: `acc_${userId}`,
          accountId: userId,
          providerId: 'credential',
          userId,
          password: passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await tx.member.create({
        data: {
          id: `mem_${pharmacyId}_${userId}`,
          organizationId: pharmacyId,
          userId,
          role: dto.role,
          createdAt: new Date(),
        },
      });
    });

    return this.getPharmacy(pharmacyId);
  }

  async updatePharmacyUser(
    pharmacyId: string,
    userId: string,
    dto: UpdatePharmacyUserDto,
  ) {
    const member = await this.prisma.member.findFirst({
      where: { organizationId: pharmacyId, userId },
      include: { user: true },
    });
    if (!member) {
      throw new NotFoundException('Utilizador não encontrado nesta farmácia.');
    }

    if (dto.email) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const conflict = await this.prisma.user.findFirst({
        where: { email: normalizedEmail, id: { not: userId } },
      });
      if (conflict) {
        throw new ConflictException('Este email já pertence a outro utilizador.');
      }
    }

    if (dto.username) {
      const normalizedUsername = dto.username.trim().toLowerCase();
      const conflict = await this.prisma.user.findFirst({
        where: { username: normalizedUsername, id: { not: userId } },
      });
      if (conflict) {
        throw new ConflictException('Este username já está em uso.');
      }
    }

    const newHash = dto.password ? await hashPassword(dto.password) : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          name: dto.name !== undefined ? dto.name.trim() : member.user.name,
          email:
            dto.email !== undefined
              ? dto.email.trim().toLowerCase()
              : member.user.email,
          username:
            dto.username !== undefined
              ? dto.username.trim().toLowerCase() || null
              : member.user.username,
          displayUsername:
            dto.username !== undefined
              ? dto.username.trim().toLowerCase() || null
              : member.user.displayUsername,
          updatedAt: new Date(),
        },
      });

      if (dto.role) {
        await tx.member.update({
          where: { id: member.id },
          data: { role: dto.role },
        });
      }

      if (newHash) {
        const credentialAcc = await tx.account.findFirst({
          where: { userId, providerId: 'credential' },
        });
        if (credentialAcc) {
          await tx.account.update({
            where: { id: credentialAcc.id },
            data: { password: newHash, updatedAt: new Date() },
          });
        } else {
          await tx.account.create({
            data: {
              id: `acc_${userId}`,
              accountId: userId,
              providerId: 'credential',
              userId,
              password: newHash,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      }
    });

    return this.getPharmacy(pharmacyId);
  }

  async removePharmacyUser(pharmacyId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { organizationId: pharmacyId, userId },
    });
    if (!member) {
      throw new NotFoundException('Utilizador não encontrado nesta farmácia.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.member.delete({ where: { id: member.id } });
      const remainingMemberships = await tx.member.count({
        where: { userId },
      });
      if (remainingMemberships === 0) {
        await tx.user.delete({ where: { id: userId } });
      }
    });

    return this.getPharmacy(pharmacyId);
  }

  // =========================================================================
  // 5. SUBSCRIPTION PLANS CRUD
  // =========================================================================
  async listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      include: {
        _count: { select: { subscriptions: true } },
      },
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  async createPlan(dto: CreatePlanDto) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException('Já existe um plano com este nome.');
    }

    return this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        monthlyPrice: dto.monthlyPrice,
        maxUsers: dto.maxUsers ?? 5,
        maxBatches: dto.maxBatches ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Plano não encontrado.');
    }

    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : existing.name,
        description:
          dto.description !== undefined
            ? dto.description.trim() || null
            : existing.description,
        monthlyPrice:
          dto.monthlyPrice !== undefined
            ? dto.monthlyPrice
            : existing.monthlyPrice,
        maxUsers: dto.maxUsers !== undefined ? dto.maxUsers : existing.maxUsers,
        maxBatches:
          dto.maxBatches !== undefined ? dto.maxBatches : existing.maxBatches,
        isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
      },
    });
  }

  async deletePlan(id: string) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Plano não encontrado.');
    }
    if (existing._count.subscriptions > 0) {
      throw new BadRequestException(
        'Não é possível remover um plano associado a farmácias. Reatribua as subscrições primeiro.',
      );
    }
    await this.prisma.subscriptionPlan.delete({ where: { id } });
    return { deleted: true, id };
  }

  // =========================================================================
  // 6. PHARMACY SUBSCRIPTIONS CRUD
  // =========================================================================
  async listSubscriptions() {
    return this.prisma.subscription.findMany({
      include: {
        organization: {
          select: { id: true, name: true, isDemo: true, demoExpiresAt: true },
        },
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertSubscription(dto: UpsertSubscriptionDto) {
    const [org, plan] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
      }),
      this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } }),
    ]);

    if (!org) throw new NotFoundException('Farmácia não encontrada.');
    if (!plan) throw new NotFoundException('Plano não encontrado.');

    const effectivePrice =
      dto.monthlyPrice !== undefined ? dto.monthlyPrice : plan.monthlyPrice;

    return this.prisma.subscription.upsert({
      where: { organizationId: dto.organizationId },
      update: {
        planId: dto.planId,
        status: dto.status,
        monthlyPrice: effectivePrice,
        currentPeriodEnd:
          dto.currentPeriodEnd !== undefined
            ? dto.currentPeriodEnd
              ? new Date(dto.currentPeriodEnd)
              : null
            : undefined,
        notes: dto.notes !== undefined ? dto.notes.trim() || null : undefined,
      },
      create: {
        organizationId: dto.organizationId,
        planId: dto.planId,
        status: dto.status,
        monthlyPrice: effectivePrice,
        currentPeriodStart: new Date(),
        currentPeriodEnd: dto.currentPeriodEnd
          ? new Date(dto.currentPeriodEnd)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: dto.notes?.trim() || null,
      },
      include: {
        organization: { select: { id: true, name: true } },
        plan: true,
      },
    });
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    const existing = await this.prisma.subscription.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Subscrição não encontrada.');
    }

    let nextPrice = existing.monthlyPrice;
    if (dto.monthlyPrice !== undefined) {
      nextPrice = dto.monthlyPrice;
    } else if (dto.planId && dto.planId !== existing.planId) {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: dto.planId },
      });
      if (!plan) throw new NotFoundException('Plano não encontrado.');
      nextPrice = plan.monthlyPrice;
    }

    return this.prisma.subscription.update({
      where: { id },
      data: {
        planId: dto.planId ?? existing.planId,
        status: dto.status ?? existing.status,
        monthlyPrice: nextPrice,
        currentPeriodEnd:
          dto.currentPeriodEnd !== undefined
            ? dto.currentPeriodEnd
              ? new Date(dto.currentPeriodEnd)
              : null
            : existing.currentPeriodEnd,
        notes:
          dto.notes !== undefined ? dto.notes.trim() || null : existing.notes,
      },
      include: {
        organization: { select: { id: true, name: true } },
        plan: true,
      },
    });
  }

  async deleteSubscription(id: string) {
    const existing = await this.prisma.subscription.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Subscrição não encontrada.');
    }
    await this.prisma.subscription.delete({ where: { id } });
    return { deleted: true, id };
  }
}
