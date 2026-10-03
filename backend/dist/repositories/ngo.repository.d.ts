export declare class NgoRepository {
    findAvailableSurplus(): Promise<({
        kitchen: {
            id: string;
            name: string;
            organizationId: string;
            location: string;
            latitude: number | null;
            longitude: number | null;
        };
    } & {
        id: string;
        date: Date;
        kitchenId: string;
        unit: string;
        status: string;
        deviceId: string | null;
        foodItem: string;
        quantitySurplus: number;
    })[]>;
    getDashboardStats(ngoId: string): Promise<{
        acceptedToday: number;
        pendingArrival: number;
    }>;
    acceptSurplusTransaction(surplusId: string, quantityRequested: number, ngoId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        surplusId: string;
        ngoId: string;
        quantityMatched: number;
    }>;
}
//# sourceMappingURL=ngo.repository.d.ts.map