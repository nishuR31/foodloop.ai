export declare class ProductionRepository {
    recordProduction(kitchenId: string, foodItem: string, quantityProduced: number, unit: string): Promise<{
        id: string;
        date: Date;
        kitchenId: string;
        unit: string;
        foodItem: string;
        quantityProduced: number;
    }>;
    consumeAndCalculateSurplus(kitchenId: string, foodItem: string, quantityConsumed: number, unit: string): Promise<{
        consumption: {
            id: string;
            date: Date;
            kitchenId: string;
            unit: string;
            foodItem: string;
            quantityConsumed: number;
        };
        surplus: {
            id: string;
            date: Date;
            kitchenId: string;
            unit: string;
            status: string;
            deviceId: string | null;
            foodItem: string;
            quantitySurplus: number;
        } | null;
    }>;
}
//# sourceMappingURL=production.repository.d.ts.map