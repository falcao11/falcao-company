import { z } from 'zod';

export const adminLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Introduza o email ou username de administrador.'),
  password: z.string().min(1, 'Introduza a palavra-passe.'),
});

export const pharmacySchema = z.object({
  name: z.string().trim().min(2, 'O nome da farmácia deve ter pelo menos 2 caracteres.'),
  nif: z
    .string()
    .trim()
    .regex(/^\d{9}$/, 'O NIF deve ter 9 dígitos.')
    .optional()
    .or(z.literal('')),
  licenseNumber: z.string().trim().optional().or(z.literal('')),
  isDemo: z.boolean(),
  demoDays: z.number().int().min(1).max(365).optional(),
  planId: z.string().optional().or(z.literal('')),
  ownerName: z.string().trim().optional().or(z.literal('')),
  ownerEmail: z
    .string()
    .trim()
    .email('Email do responsável inválido.')
    .optional()
    .or(z.literal('')),
  ownerUsername: z.string().trim().optional().or(z.literal('')),
  ownerPassword: z
    .string()
    .min(6, 'A password deve ter pelo menos 6 caracteres.')
    .optional()
    .or(z.literal('')),
});

export const pharmacyUserSchema = z.object({
  name: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  email: z.string().trim().email('Introduza um email válido.'),
  username: z
    .string()
    .trim()
    .min(3, 'Username mínimo de 3 caracteres.')
    .optional()
    .or(z.literal('')),
  role: z.enum(['owner', 'admin', 'member']),
  password: z
    .string()
    .min(6, 'A password deve ter pelo menos 6 caracteres.')
    .optional()
    .or(z.literal('')),
});

export const planSchema = z.object({
  name: z.string().trim().min(2, 'O nome do plano é obrigatório.'),
  description: z.string().trim().optional().or(z.literal('')),
  monthlyPrice: z.number().min(0, 'O preço mensal deve ser >= 0.'),
  maxUsers: z.number().int().min(1, 'Mínimo de 1 utilizador.'),
  maxBatches: z.number().int().min(1).nullable().optional(),
  isActive: z.boolean(),
});

export const subscriptionSchema = z.object({
  organizationId: z.string().min(1, 'Selecione uma farmácia.'),
  planId: z.string().min(1, 'Selecione um plano.'),
  status: z.enum(['ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELED']),
  monthlyPrice: z.number().min(0, 'Preço mensal inválido.'),
  notes: z.string().trim().optional().or(z.literal('')),
});
