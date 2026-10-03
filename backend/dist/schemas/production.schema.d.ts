import { z } from 'zod';
export declare const prodSchema: z.ZodObject<{
    foodItem: z.ZodString;
    quantityProduced: z.ZodNumber;
    unit: z.ZodString;
}, z.core.$strip>;
export declare const consSchema: z.ZodObject<{
    foodItem: z.ZodString;
    quantityConsumed: z.ZodNumber;
    unit: z.ZodString;
}, z.core.$strip>;
export type ProdInput = z.infer<typeof prodSchema>;
export type ConsInput = z.infer<typeof consSchema>;
//# sourceMappingURL=production.schema.d.ts.map