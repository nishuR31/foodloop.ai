import { z } from 'zod';
export declare const deliveryStatusSchema: z.ZodObject<{
    status: z.ZodString;
}, z.core.$strip>;
export type DeliveryStatusInput = z.infer<typeof deliveryStatusSchema>;
//# sourceMappingURL=delivery.schema.d.ts.map