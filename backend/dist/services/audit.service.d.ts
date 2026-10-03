export declare class AuditService {
    logAction(data: {
        entityId: string;
        entityType: string;
        action: string;
        actorId?: string;
        details?: any;
    }): Promise<{
        id: string;
        createdAt: Date;
        entityId: string;
        entityType: string;
        action: string;
        actorId: string | null;
        details: string | null;
        blockchainHash: string | null;
    }>;
    getAuditLogs(): Promise<{
        id: string;
        createdAt: Date;
        entityId: string;
        entityType: string;
        action: string;
        actorId: string | null;
        details: string | null;
        blockchainHash: string | null;
    }[]>;
}
//# sourceMappingURL=audit.service.d.ts.map