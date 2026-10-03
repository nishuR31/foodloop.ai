import { AcceptSurplusInput } from '../schemas/ngo.schema';
export declare class NgoService {
    getAvailableSurplus(user?: any): Promise<({
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
    private getDistanceFromLatLonInKm;
    getDashboardStats(user: any): Promise<{
        acceptedToday: number;
        pendingArrival: number;
    }>;
    acceptSurplus(user: any, input: AcceptSurplusInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        surplusId: string;
        ngoId: string;
        quantityMatched: number;
    }>;
}
//# sourceMappingURL=ngo.service.d.ts.map