export declare class AnalyticsService {
    getImpact(): Promise<{
        id: string;
        date: Date;
        wastePreventedKg: number;
        mealsSaved: number;
        co2eAvoidedKg: number;
        waterSavedLiters: number;
        moneySaved: number;
    } | null>;
    getKitchenDashboard(user: any): Promise<{
        predictions: {
            id: string;
            createdAt: Date;
            kitchenId: string;
            targetDate: Date;
            predictedDemand: number;
            recommendedProduction: number;
            expectedSurplus: number;
            confidence: number;
            aiReasoning: string | null;
        }[];
        productions: {
            id: string;
            date: Date;
            kitchenId: string;
            unit: string;
            foodItem: string;
            quantityProduced: number;
        }[];
        consumptions: {
            id: string;
            date: Date;
            kitchenId: string;
            unit: string;
            foodItem: string;
            quantityConsumed: number;
        }[];
        activeSurpluses: {
            id: string;
            date: Date;
            kitchenId: string;
            unit: string;
            status: string;
            deviceId: string | null;
            foodItem: string;
            quantitySurplus: number;
        }[];
        activeAlerts: {
            id: string;
            createdAt: Date;
            message: string;
            title: string;
            severity: string;
            isResolved: boolean;
        }[];
    }>;
    getSystemOverview(user: any): Promise<{
        totalSurplusRescued: number;
        co2Prevented: number;
        moneySaved: number;
        waterSavedLiters: number;
        activeOrgs: {
            KITCHEN: number;
            NGO: number;
        };
    }>;
    getActivityTimeline(user: any): Promise<({
        id: string;
        title: string;
        description: string;
        status: string;
        timestamp: Date;
    } | undefined)[]>;
    getOrganizations(user: any): Promise<({
        _count: {
            users: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
    })[]>;
    getLeaderboard(): Promise<{
        kitchens: {
            id: string;
            name: string;
            type: string;
            score: number;
        }[];
        ngos: {
            id: string;
            name: string;
            type: string;
            score: number;
        }[];
    }>;
}
//# sourceMappingURL=analytics.service.d.ts.map