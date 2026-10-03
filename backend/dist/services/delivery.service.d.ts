import { DeliveryStatusInput } from '../schemas/delivery.schema';
export declare class DeliveryService {
    getDeliveries(user: any): Promise<any[]>;
    getAvailableDeliveries(): Promise<{
        calculatedRoute: {
            distanceText: string;
            durationText: string;
        };
        redistribution: {
            surplus: {
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
            };
            ngo: {
                id: string;
                name: string;
                organizationId: string;
                location: string;
                latitude: number | null;
                longitude: number | null;
                capacity: number | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            surplusId: string;
            ngoId: string;
            quantityMatched: number;
        };
        id: string;
        status: string;
        redistributionId: string;
        driverId: string | null;
        pickupTime: Date | null;
        deliveryTime: Date | null;
    }[]>;
    claimDelivery(deliveryId: string, user: any): Promise<{
        id: string;
        status: string;
        redistributionId: string;
        driverId: string | null;
        pickupTime: Date | null;
        deliveryTime: Date | null;
    }>;
    updateDeliveryStatus(deliveryId: string, input: DeliveryStatusInput): Promise<{
        id: string;
        status: string;
        redistributionId: string;
        driverId: string | null;
        pickupTime: Date | null;
        deliveryTime: Date | null;
    }>;
}
//# sourceMappingURL=delivery.service.d.ts.map