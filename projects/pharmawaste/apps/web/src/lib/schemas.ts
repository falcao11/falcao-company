import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Introduza o seu email ou username.'),
  password: z
    .string()
    .min(1, 'Introduza a palavra-passe.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const accountRequestSchema = z.object({
  pharmacyName: z
    .string()
    .trim()
    .min(2, 'O nome da farmácia deve ter pelo menos 2 caracteres.'),
  nif: z
    .string()
    .trim()
    .regex(/^\d{9}$/, 'O NIF deve ter exatamente 9 dígitos.')
    .optional()
    .or(z.literal('')),
  licenseNumber: z
    .string()
    .trim()
    .max(50, 'Alvará demasiado longo.')
    .optional()
    .or(z.literal('')),
  contactName: z
    .string()
    .trim()
    .min(2, 'O nome do responsável deve ter pelo menos 2 caracteres.'),
  email: z
    .string()
    .trim()
    .email('Introduza um endereço de email válido.'),
  phone: z
    .string()
    .trim()
    .min(9, 'O telefone deve ter pelo menos 9 dígitos.')
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .trim()
    .max(500, 'As observações não podem exceder 500 caracteres.')
    .optional()
    .or(z.literal('')),
});

export type AccountRequestFormValues = z.infer<typeof accountRequestSchema>;
