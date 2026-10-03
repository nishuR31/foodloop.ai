import { Prisma } from '@prisma/client';
export declare class InventoryRepository {
    findManyByKitchenId(kitchenId?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        kitchenId: string;
        productName: string;
        category: string;
        quantity: number;
        unit: string;
        batchNumber: string | null;
        barcode: string | null;
        manufacturingDate: Date | null;
        expiryDate: Date | null;
        storageLocation: string | null;
        storageTemperature: number | null;
        status: string;
    }[]>;
    create(data: Prisma.InventoryItemUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        kitchenId: string;
        productName: string;
        category: string;
        quantity: number;
        unit: string;
        batchNumber: string | null;
        barcode: string | null;
        manufacturingDate: Date | null;
        expiryDate: Date | null;
        storageLocation: string | null;
        storageTemperature: number | null;
        status: string;
    }>;
}
//# sourceMappingURL=inventory.repository.d.ts.map