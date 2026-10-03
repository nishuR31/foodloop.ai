export interface SensorDataInput {
    deviceId: string;
    temperature: number;
    humidity: number;
    mq2Raw: number;
    mq2Mv?: number;
    mq3Raw: number;
    mq3Mv?: number;
    gasIndex?: number;
    temperatureIndex?: number;
    humidityIndex?: number;
    spoilageScore: number;
    status: string;
}
export declare class SensorsRepository {
    /**
     * Persist one sensor reading from ESP32.
     */
    createReading(data: SensorDataInput): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        deviceId: string;
        temperature: number;
        humidity: number;
        mq2Raw: number;
        mq2Mv: number | null;
        mq3Raw: number;
        mq3Mv: number | null;
        gasIndex: number | null;
        temperatureIndex: number | null;
        humidityIndex: number | null;
        spoilageScore: number;
    }>;
    /**
     * Latest reading for a specific device.
     */
    getLatestByDevice(deviceId: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        deviceId: string;
        temperature: number;
        humidity: number;
        mq2Raw: number;
        mq2Mv: number | null;
        mq3Raw: number;
        mq3Mv: number | null;
        gasIndex: number | null;
        temperatureIndex: number | null;
        humidityIndex: number | null;
        spoilageScore: number;
    } | null>;
    /**
     * History — most recent N readings, newest first.
     */
    getHistoryByDevice(deviceId: string, limit?: number): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        deviceId: string;
        temperature: number;
        humidity: number;
        mq2Raw: number;
        mq2Mv: number | null;
        mq3Raw: number;
        mq3Mv: number | null;
        gasIndex: number | null;
        temperatureIndex: number | null;
        humidityIndex: number | null;
        spoilageScore: number;
    }[]>;
    /**
     * All unique device IDs seen so far.
     */
    getKnownDevices(): Promise<string[]>;
    /**
     * Create a persistent alert record.
     */
    createAlert(title: string, message: string, severity: 'INFO' | 'WARNING' | 'CRITICAL'): Promise<{
        id: string;
        createdAt: Date;
        message: string;
        title: string;
        severity: string;
        isResolved: boolean;
    }>;
    /**
     * Latest unresolved alerts.
     */
    getActiveAlerts(limit?: number): Promise<{
        id: string;
        createdAt: Date;
        message: string;
        title: string;
        severity: string;
        isResolved: boolean;
    }[]>;
    resolveAlert(id: string): Promise<{
        id: string;
        createdAt: Date;
        message: string;
        title: string;
        severity: string;
        isResolved: boolean;
    }>;
    /**
     * Aggregate stats across all readings for a device.
     */
    getDeviceStats(deviceId: string): Promise<import(".prisma/client").Prisma.GetFoodSpoilageSensorDataAggregateType<{
        where: {
            deviceId: string;
        };
        _avg: {
            temperature: true;
            humidity: true;
            spoilageScore: true;
        };
        _max: {
            spoilageScore: true;
            temperature: true;
        };
        _min: {
            temperature: true;
        };
        _count: true;
    }>>;
}
//# sourceMappingURL=sensors.repository.d.ts.map