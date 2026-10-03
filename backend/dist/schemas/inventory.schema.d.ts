import { z } from 'zod';
export declare const inventorySchema: z.ZodObject<{
    productName: z.ZodString;
    category: z.ZodString;
    quantity: z.ZodNumber;
    unit: z.ZodString;
    batchNumber: z.ZodOptional<z.ZodString>;
    barcode: z.ZodOptional<z.ZodString>;
    manufacturingDate: z.ZodOptional<z.ZodString>;
    expiryDate: z.ZodOptional<z.ZodString>;
    storageLocation: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type InventoryInput = z.infer<typeof inventorySchema>;
//# sourceMappingURL=inventory.schema.d.ts.map