import axios from 'axios';
import FormData from 'form-data';

export class OcrProvider {
  private apiUrl = process.env.OCR_SERVICE_URL || 'http://localhost:8000';
  private apiKey = process.env.OCR_SERVICE_API_KEY || 'dev_ocr_secret_key_123';
  private timeoutMs = parseInt(process.env.OCR_SERVICE_TIMEOUT_MS || '15000');

  async extractLabel(fileBuffer: Buffer, filename: string, mimeType: string) {
    const formData = new FormData();
    formData.append('file', fileBuffer, { filename, contentType: mimeType });

    try {
      const response = await axios.post(`${this.apiUrl}/v1/ocr/extract-label`, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-OCR-Service-Key': this.apiKey
        },
        timeout: this.timeoutMs,
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error?.message || 'OCR Service Error');
      }
      throw new Error(error.message || 'Failed to connect to OCR Service');
    }
  }
  async predictDemand(history: any[]) {
    try {
      const response = await axios.post(`${this.apiUrl}/v1/ai/predict-demand`, { history }, {
        headers: { 'X-OCR-Service-Key': this.apiKey },
        timeout: this.timeoutMs,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'OCR Service Error');
      }
      throw new Error(error.message || 'Failed to connect to OCR Service');
    }
  }

  async analyzeQuality(imageParts: any[]) {
    try {
      const response = await axios.post(`${this.apiUrl}/v1/ai/analyze-quality`, { imageParts }, {
        headers: { 'X-OCR-Service-Key': this.apiKey },
        timeout: this.timeoutMs,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'OCR Service Error');
      }
      throw new Error(error.message || 'Failed to connect to OCR Service');
    }
  }
}
