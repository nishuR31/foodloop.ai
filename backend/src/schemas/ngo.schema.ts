import { z } from 'zod';

export const acceptSurplusSchema = z.object({
  surplusId: z.string(),
  quantityRequested: z.number()
});

export type AcceptSurplusInput = z.infer<typeof acceptSurplusSchema>;
