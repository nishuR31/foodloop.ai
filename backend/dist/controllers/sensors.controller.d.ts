import { FastifyRequest, FastifyReply } from 'fastify';
export declare class SensorsController {
    receiveData(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    getDeviceStatus(request: FastifyRequest<{
        Params: {
            deviceId: string;
        };
    }>, reply: FastifyReply): Promise<never>;
    getDeviceHistory(request: FastifyRequest<{
        Params: {
            deviceId: string;
        };
        Querystring: {
            limit?: string;
        };
    }>, reply: FastifyReply): Promise<never>;
    getDeviceStats(request: FastifyRequest<{
        Params: {
            deviceId: string;
        };
    }>, reply: FastifyReply): Promise<never>;
    getKnownDevices(_request: FastifyRequest, reply: FastifyReply): Promise<never>;
    getActiveAlerts(_request: FastifyRequest, reply: FastifyReply): Promise<never>;
    resolveAlert(request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<never>;
    getLatest(_request: FastifyRequest, reply: FastifyReply): Promise<never>;
    getSensors(request: FastifyRequest, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=sensors.controller.d.ts.map