export declare class OcrProvider {
    private apiUrl;
    private apiKey;
    private timeoutMs;
    extractLabel(fileBuffer: Buffer, filename: string, mimeType: string): Promise<any>;
    predictDemand(history: any[]): Promise<any>;
    analyzeQuality(imageParts: any[]): Promise<any>;
}
//# sourceMappingURL=ocr.provider.d.ts.map