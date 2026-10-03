export declare class AnalyticsRepository {
    getLatestImpact(): Promise<{
        id: string;
        date: Date;
        wastePreventedKg: number;
        mealsSaved: number;
        co2eAvoidedKg: number;
        waterSavedLiters: number;
        moneySaved: number;
    } | null>;
    getKitchenDashboard(kitchenId: string): Promise<{
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
    getSystemOverview(): Promise<{
        totalSurplusRescued: number;
        co2Prevented: number;
        moneySaved: number;
        waterSavedLiters: number;
        activeOrgs: {
            KITCHEN: number;
            NGO: number;
        };
    }>;
    getActivityTimeline(): Promise<({
        id: string;
        title: string;
        description: string;
        status: string;
        timestamp: Date;
    } | undefined)[]>;
    getOrganizations(): Promise<({
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
//# sourceMappingURL=analytics.repository.d.ts.map