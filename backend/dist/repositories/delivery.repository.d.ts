export declare class DeliveryRepository {
    findDriverByUserId(userId: string): Promise<{
        id: string;
        userId: string;
        vehicleNo: string | null;
        isAvailable: boolean;
    } | null>;
    findDeliveriesByDriverId(driverId: string): Promise<({
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
    } & {
        id: string;
        status: string;
        redistributionId: string;
        driverId: string | null;
        pickupTime: Date | null;
        deliveryTime: Date | null;
    })[]>;
    findDeliveriesByNgoId(userId: string): Promise<({
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
    } & {
        id: string;
        status: string;
        redistributionId: string;
        driverId: string | null;
        pickupTime: Date | null;
        deliveryTime: Date | null;
    })[]>;
    findDeliveriesByKitchenId(userId: string): Promise<({
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
    } & {
        id: string;
        status: string;
        redistributionId: string;
        driverId: string | null;
        pickupTime: Date | null;
        deliveryTime: Date | null;
    })[]>;
    findAvailableDeliveries(): Promise<({
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
    } & {
        id: string;
        status: string;
        redistributionId: string;
        driverId: string | null;
        pickupTime: Date | null;
        deliveryTime: Date | null;
    })[]>;
    claimDelivery(deliveryId: string, driverId: string): Promise<{
        id: string;
        status: string;
        redistributionId: string;
        driverId: string | null;
        pickupTime: Date | null;
        deliveryTime: Date | null;
    }>;
    updateDeliveryStatusTransaction(deliveryId: string, status: string): Promise<{
        id: string;
        status: string;
        redistributionId: string;
        driverId: string | null;
        pickupTime: Date | null;
        deliveryTime: Date | null;
    }>;
}
//# sourceMappingURL=delivery.repository.d.ts.map