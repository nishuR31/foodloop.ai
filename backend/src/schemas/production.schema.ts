import { z } from 'zod';

export const prodSchema = z.object({
  foodItem: z.string(),
  quantityProduced: z.number(),
  unit: z.string()
});

export const consSchema = z.object({
  foodItem: z.string(),
  quantityConsumed: z.number(),
  unit: z.string()
});

export type ProdInput = z.infer<typeof prodSchema>;
export type ConsInput = z.infer<typeof consSchema>;
