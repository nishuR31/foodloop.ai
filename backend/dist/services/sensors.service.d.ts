export declare const THRESHOLDS: {
    GOOD_MAX: number;
    CAUTION_MAX: number;
    TEMP_COLD: number;
    TEMP_WARM: number;
    TEMP_DANGER: number;
    HUM_LOW: number;
    HUM_HIGH: number;
    MQ2_WARN: number;
    MQ2_CRIT: number;
    MQ3_WARN: number;
    MQ3_CRIT: number;
};
export interface DetectionResult {
    status: 'GOOD' | 'CAUTION' | 'SPOILED';
    spoilageScore: number;
    gasIndex: number;
    temperatureIndex: number;
    humidityIndex: number;
    alerts: DetectedAlert[];
    ledCommand: 'GREEN' | 'YELLOW' | 'RED';
    buzzerCommand: 'OFF' | 'SINGLE_BEEP' | 'TRIPLE_BEEP';
}
export interface DetectedAlert {
    title: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
}
export declare class SensorsService {
    private repo;
    static calculateSpoilageScore(temp: number, hum: number, mq2Raw: number, mq3Raw: number): {
        spoilageScore: number;
        gasIndex: number;
        temperatureIndex: number;
        humidityIndex: number;
    };
    static detect(temp: number, hum: number, mq2Raw: number, mq3Raw: number, overriddenScore?: number, // use score supplied by ESP32 when present
    overriddenStatus?: string, isHotFood?: boolean): DetectionResult;
    ingestSensorData(raw: Record<string, any>): Promise<{
        saved: {
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
        };
        detection: DetectionResult;
    }>;
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
    getKnownDevices(): Promise<string[]>;
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
    getActiveAlerts(): Promise<{
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
}
//# sourceMappingURL=sensors.service.d.ts.map