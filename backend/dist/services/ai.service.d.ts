import { DemandPredictionInput, AnalyzeQualityInput } from '../schemas/ai.schema';
export declare class AiService {
    ocrExtract(fileBuffer: Buffer, filename: string, mimeType: string): Promise<any>;
    demandPrediction(input: DemandPredictionInput): Promise<any>;
    analyzeQuality(input: AnalyzeQualityInput): Promise<{
        quality_status: string;
        visible_issues: any[];
        confidence: any;
        recommendation: string;
    }>;
    getScans(): Promise<{
        id: string;
        createdAt: Date;
        kitchenId: string | null;
        status: string;
        confidence: number;
        item: string;
        issues: string | null;
        recommendation: string | null;
    }[]>;
    getRecommendations(kitchenId?: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        description: string;
        context: string | null;
    }[]>;
}
//# sourceMappingURL=ai.service.d.ts.map