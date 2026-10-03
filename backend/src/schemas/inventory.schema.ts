import { z } from 'zod';

export const inventorySchema = z.object({
  productName: z.string(),
  category: z.string(),
  quantity: z.number(),
  unit: z.string(),
  batchNumber: z.string().optional(),
  barcode: z.string().optional(),
  manufacturingDate: z.string().optional(),
  expiryDate: z.string().optional(),
  storageLocation: z.string().optional(),
});

export type InventoryInput = z.infer<typeof inventorySchema>;
