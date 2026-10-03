import { z } from 'zod';

// Strong password: min 8 chars, uppercase, lowercase, digit, special character
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
const strongPasswordMessage =
  'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, strongPasswordMessage).regex(strongPasswordRegex, strongPasswordMessage),
});

export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, strongPasswordMessage).regex(strongPasswordRegex, strongPasswordMessage),
  role: z.enum(['KITCHEN', 'NGO', 'LOGISTICS', 'ADMIN']),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8, strongPasswordMessage).regex(strongPasswordRegex, strongPasswordMessage),
});
