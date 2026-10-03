"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
class OcrProvider {
    apiUrl = process.env.OCR_SERVICE_URL || 'http://localhost:8000';
    apiKey = process.env.OCR_SERVICE_API_KEY || 'dev_ocr_secret_key_123';
    timeoutMs = parseInt(process.env.OCR_SERVICE_TIMEOUT_MS || '15000');
    async extractLabel(fileBuffer, filename, mimeType) {
        const formData = new form_data_1.default();
        formData.append('file', fileBuffer, { filename, contentType: mimeType });
        try {
            const response = await axios_1.default.post(`${this.apiUrl}/v1/ocr/extract-label`, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'X-OCR-Service-Key': this.apiKey
                },
                timeout: this.timeoutMs,
            });
            return response.data;
        }
        catch (error) {
            if (error.response) {
                throw new Error(error.response.data?.error?.message || 'OCR Service Error');
            }
            throw new Error(error.message || 'Failed to connect to OCR Service');
        }
    }
    async predictDemand(history) {
        try {
            const response = await axios_1.default.post(`${this.apiUrl}/v1/ai/predict-demand`, { history }, {
                headers: { 'X-OCR-Service-Key': this.apiKey },
                timeout: this.timeoutMs,
            });
            return response.data;
        }
        catch (error) {
            if (error.response) {
                throw new Error(error.response.data?.error || 'OCR Service Error');
            }
            throw new Error(error.message || 'Failed to connect to OCR Service');
        }
    }
    async analyzeQuality(imageParts) {
        try {
            const response = await axios_1.default.post(`${this.apiUrl}/v1/ai/analyze-quality`, { imageParts }, {
                headers: { 'X-OCR-Service-Key': this.apiKey },
                timeout: this.timeoutMs,
            });
            return response.data;
        }
        catch (error) {
            if (error.response) {
                throw new Error(error.response.data?.error || 'OCR Service Error');
            }
            throw new Error(error.message || 'Failed to connect to OCR Service');
        }
    }
}
exports.OcrProvider = OcrProvider;
//# sourceMappingURL=ocr.provider.js.map