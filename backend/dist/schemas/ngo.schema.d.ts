import { z } from 'zod';
export declare const acceptSurplusSchema: z.ZodObject<{
    surplusId: z.ZodString;
    quantityRequested: z.ZodNumber;
}, z.core.$strip>;
export type AcceptSurplusInput = z.infer<typeof acceptSurplusSchema>;
//# sourceMappingURL=ngo.schema.d.ts.map