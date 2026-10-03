import { z } from 'zod';

export const ocrSchema = z.object({
  text: z.string().optional(),
  imageParts: z.array(z.object({
    inlineData: z.object({
      data: z.string(),
      mimeType: z.string()
    })
  })).optional()
});

export const demandPredictionSchema = z.object({
  kitchenId: z.string().optional(),
  targetDate: z.string().optional(),
  historicalDemand: z.any().optional()
});

export const analyzeQualitySchema = z.object({
  imageParts: z.array(z.object({
    inlineData: z.object({
      data: z.string(),
      mimeType: z.string()
    })
  }))
});

export type OcrInput = z.infer<typeof ocrSchema>;
export type DemandPredictionInput = z.infer<typeof demandPredictionSchema>;
export type AnalyzeQualityInput = z.infer<typeof analyzeQualitySchema>;
