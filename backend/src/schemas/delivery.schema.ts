import { z } from 'zod';

export const deliveryStatusSchema = z.object({
  status: z.string()
});

export type DeliveryStatusInput = z.infer<typeof deliveryStatusSchema>;
