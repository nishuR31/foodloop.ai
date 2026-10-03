import { ProdInput, ConsInput } from '../schemas/production.schema';
export declare class ProductionService {
    recordProduction(user: any, input: ProdInput): Promise<{
        id: string;
        date: Date;
        kitchenId: string;
        unit: string;
        foodItem: string;
        quantityProduced: number;
    }>;
    consumeAndCalculateSurplus(user: any, input: ConsInput): Promise<{
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
//# sourceMappingURL=production.service.d.ts.map