import { z } from 'zod';

export const loginSchema = z.object({
    username: z
        .string()
        .min(1, 'El usuario es requerido')
        .max(50, 'Usuario demasiado extenso')
        .trim()
        .regex(/^[a-zA-Z0-9_.-]+$/, 'Usuario no válido'),
    password: z
        .string()
        .min(1, 'La contraseña es requerida')
        .max(128, 'Contraseña demasiado extensa')
});

export type LoginInput = z.infer<typeof loginSchema>;