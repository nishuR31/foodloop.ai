import { z } from 'zod';
export declare const ocrSchema: z.ZodObject<{
    text: z.ZodOptional<z.ZodString>;
    imageParts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        inlineData: z.ZodObject<{
            data: z.ZodString;
            mimeType: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const demandPredictionSchema: z.ZodObject<{
    kitchenId: z.ZodOptional<z.ZodString>;
    targetDate: z.ZodOptional<z.ZodString>;
    historicalDemand: z.ZodOptional<z.ZodAny>;
}, z.core.$strip>;
export declare const analyzeQualitySchema: z.ZodObject<{
    imageParts: z.ZodArray<z.ZodObject<{
        inlineData: z.ZodObject<{
            data: z.ZodString;
            mimeType: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type OcrInput = z.infer<typeof ocrSchema>;
export type DemandPredictionInput = z.infer<typeof demandPredictionSchema>;
export type AnalyzeQualityInput = z.infer<typeof analyzeQualitySchema>;
//# sourceMappingURL=ai.schema.d.ts.map