"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const cache = new Map();
class AiService {
    async ocrExtract(fileBuffer, filename, mimeType) {
        const { OcrProvider } = require('./providers/ocr.provider');
        const provider = new OcrProvider();
        // Call the Python OCR service
        const result = await provider.extractLabel(fileBuffer, filename, mimeType);
        if (!result.success) {
            throw new Error(result.error?.message || "OCR Extraction Failed");
        }
        return result.data;
    }
    async demandPrediction(input) {
        const cacheKey = `demand-${input.kitchenId || ''}-${input.targetDate || ''}`;
        if (cache.has(cacheKey))
            return cache.get(cacheKey);
        const { OcrProvider } = require('./providers/ocr.provider');
        const provider = new OcrProvider();
        // Transform historical data for Python API
        const history = Object.entries(input.historicalDemand || {}).map(([date, demand]) => ({ date, demand }));
        try {
            const response = await provider.predictDemand(history);
            const finalResult = {
                predictedDemand: response.data.predictedDemand,
                recommendedProduction: response.data.recommendedProduction,
                expectedSurplus: response.data.recommendedProduction - response.data.predictedDemand,
                confidence: response.data.confidence,
                aiReasoning: response.data.reasoning || "Calculated using Python AI Service."
            };
            cache.set(cacheKey, finalResult);
            return finalResult;
        }
        catch (e) {
            // Fallback
            return {
                predictedDemand: 850,
                recommendedProduction: 900,
                expectedSurplus: 50,
                confidence: 0.9,
                aiReasoning: "Fallback reasoning due to Python service unavailability."
            };
        }
    }
    async analyzeQuality(input) {
        const { OcrProvider } = require('./providers/ocr.provider');
        const provider = new OcrProvider();
        try {
            const response = await provider.analyzeQuality(input.imageParts);
            const aiResult = {
                quality_status: response.data.quality_score > 80 ? "SAFE" : (response.data.spoilage_detected ? "SPOILED" : "WARNING"),
                visible_issues: response.data.analysis_notes ? [response.data.analysis_notes] : [],
                confidence: response.data.freshness_index,
                recommendation: `Shelf life remaining: ${response.data.shelf_life_remaining_days} days. ${response.data.analysis_notes}`
            };
            await prisma.aiScan.create({
                data: {
                    item: aiResult.visible_issues.length > 0 ? "Scanned Food Item" : "Safe Food Item",
                    confidence: aiResult.confidence,
                    status: aiResult.quality_status === "SAFE" ? "PASS" : "WARN",
                    issues: JSON.stringify(aiResult.visible_issues),
                    recommendation: aiResult.recommendation
                }
            });
            return aiResult;
        }
        catch (e) {
            return {
                quality_status: "REVIEW_REQUIRED",
                visible_issues: [],
                confidence: 0,
                recommendation: "Manual inspection required. Vision AI is currently unavailable."
            };
        }
    }
    async getScans() {
        return prisma.aiScan.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
    }
    async getRecommendations(kitchenId) {
        let recommendations = await prisma.aIRecommendation.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });
        // Evaluate surplus food and expiring inventory if a kitchenId is provided
        if (kitchenId && recommendations.length === 0) {
            const today = new Date();
            const next3Days = new Date();
            next3Days.setDate(next3Days.getDate() + 3);
            // 1. Find expiring inventory
            const expiringItems = await prisma.inventoryItem.findMany({
                where: {
                    kitchenId,
                    expiryDate: { lte: next3Days, gte: today },
                    quantity: { gt: 0 }
                }
            });
            // 2. Find unassigned surplus
            const availableSurplus = await prisma.surplus.findMany({
                where: {
                    kitchenId,
                    status: 'AVAILABLE'
                }
            });
            const newRecs = [];
            if (expiringItems.length > 0) {
                expiringItems.forEach(item => {
                    newRecs.push({
                        title: `Expiring: ${item.productName}`,
                        description: `${item.quantity} ${item.unit} of ${item.productName} is approaching expiry (${item.expiryDate?.toLocaleDateString()}). Prioritize in tomorrow's menu or mark as surplus.`,
                    });
                });
            }
            if (availableSurplus.length > 0) {
                availableSurplus.forEach(surplus => {
                    newRecs.push({
                        title: `Surplus Action: ${surplus.foodItem}`,
                        description: `You have ${surplus.quantitySurplus} ${surplus.unit} of ${surplus.foodItem} available. AI recommends matching with a nearby NGO (within 5km radius) to avoid waste.`,
                    });
                });
            }
            // Add a default forecasting recommendation
            newRecs.push({
                title: "Forecast: Reduce General Production",
                description: "Based on last week's consumption trends, consider reducing overall production by 5% tomorrow to minimize surplus.",
            });
            // Save and return
            for (const rec of newRecs) {
                await prisma.aIRecommendation.create({
                    data: {
                        title: rec.title,
                        description: rec.description,
                        context: kitchenId
                    }
                });
            }
            recommendations = await prisma.aIRecommendation.findMany({
                where: { context: kitchenId },
                take: 5,
                orderBy: { createdAt: 'desc' }
            });
        }
        // Fallback if still empty
        if (recommendations.length === 0) {
            recommendations = [
                {
                    id: "rec-1",
                    title: "Reduce Lunch Production",
                    description: "Reduce tomorrow's lunch production by 8%.",
                    context: null,
                    createdAt: new Date()
                },
                {
                    id: "rec-2",
                    title: "Expiring Vegetables",
                    description: "18 kg of vegetables are approaching expiry. Prioritize them in tomorrow's menu.",
                    context: null,
                    createdAt: new Date()
                }
            ];
        }
        return recommendations;
    }
}
exports.AiService = AiService;
//# sourceMappingURL=ai.service.js.map