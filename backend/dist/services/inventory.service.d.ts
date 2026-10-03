import { InventoryInput } from '../schemas/inventory.schema';
export declare class InventoryService {
    getInventory(user: any): Promise<{
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
    createInventoryItem(user: any, input: InventoryInput): Promise<{
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
//# sourceMappingURL=inventory.service.d.ts.map