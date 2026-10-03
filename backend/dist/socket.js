"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
exports.getIO = getIO;
exports.setupSocket = setupSocket;
const socket_io_1 = require("socket.io");
let ioInstance = null;
exports.io = ioInstance;
function getIO() {
    return ioInstance;
}
function setupSocket(server) {
    exports.io = ioInstance = new socket_io_1.Server(server.server, {
        cors: {
            origin: (origin, cb) => {
                if (!origin)
                    return cb(null, true);
                const allowed = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];
                if (allowed.includes(origin) || origin.startsWith('http://localhost:') || origin.endsWith('.vercel.app')) {
                    return cb(null, true);
                }
                cb(new Error('Not allowed by CORS'), false);
            },
            credentials: true
        }
    });
    ioInstance.on('connection', (socket) => {
        server.log.info(`[Socket.io] Client connected: ${socket.id}`);
        // Helper for standardized socket responses
        const handleSocketRPC = async (eventName, cb, actionFn) => {
            try {
                const result = await actionFn();
                const response = { success: true, data: result };
                socket.emit(`${eventName}:response`, response);
                if (typeof cb === 'function')
                    cb(response);
            }
            catch (err) {
                const errorResponse = { success: false, message: err.message || 'Error processing request' };
                socket.emit(`${eventName}:error`, errorResponse);
                if (typeof cb === 'function')
                    cb(errorResponse);
            }
        };
        // System & Health Endpoints over Socket
        socket.on('ping', (data, cb) => {
            const response = { status: 'pong', timestamp: new Date().toISOString() };
            socket.emit('pong', response);
            if (typeof cb === 'function')
                cb(response);
        });
        socket.on('health', (data, cb) => {
            const response = { status: 'ok', service: 'FoodLoop Backend API', timestamp: new Date().toISOString() };
            socket.emit('health:response', response);
            if (typeof cb === 'function')
                cb(response);
        });
        // Inventory Endpoints over Socket
        socket.on('inventory:get', (user, cb) => {
            handleSocketRPC('inventory:get', cb, async () => {
                const { InventoryService } = require('./services/inventory.service');
                return new InventoryService().getInventory(user || { role: 'ADMIN' });
            });
        });
        socket.on('inventory:create', ({ user, input }, cb) => {
            handleSocketRPC('inventory:create', cb, async () => {
                const { InventoryService } = require('./services/inventory.service');
                const item = await new InventoryService().createInventoryItem(user, input);
                ioInstance?.emit('inventory_updated', item);
                return item;
            });
        });
        // Production Endpoints over Socket
        socket.on('production:record', ({ user, input }, cb) => {
            handleSocketRPC('production:record', cb, async () => {
                const { ProductionService } = require('./services/production.service');
                const record = await new ProductionService().recordProduction(user, input);
                ioInstance?.emit('production_updated', record);
                return record;
            });
        });
        socket.on('production:consume', ({ user, input }, cb) => {
            handleSocketRPC('production:consume', cb, async () => {
                const { ProductionService } = require('./services/production.service');
                const result = await new ProductionService().consumeAndCalculateSurplus(user, input);
                ioInstance?.emit('surplus_updated', result);
                return result;
            });
        });
        // Delivery & Logistics Endpoints over Socket
        socket.on('delivery:get', (user, cb) => {
            handleSocketRPC('delivery:get', cb, async () => {
                const { DeliveryService } = require('./services/delivery.service');
                return new DeliveryService().getDeliveries(user || { role: 'DRIVER', id: 'driver-1' });
            });
        });
        socket.on('delivery:update_status', ({ deliveryId, status }, cb) => {
            handleSocketRPC('delivery:update_status', cb, async () => {
                const { DeliveryService } = require('./services/delivery.service');
                const updated = await new DeliveryService().updateDeliveryStatus(deliveryId, { status });
                ioInstance?.emit('delivery_updated', { deliveryId, status });
                return updated;
            });
        });
        // Sensors — real DB data from ESP32 ingestion
        socket.on('sensor:get', ({ deviceId } = {}, cb) => {
            handleSocketRPC('sensor:get', cb, async () => {
                const { SensorsService } = require('./services/sensors.service');
                const svc = new SensorsService();
                const knownDevices = await svc.getKnownDevices();
                const targetDevice = deviceId || knownDevices[0];
                if (!targetDevice) {
                    return { message: 'No ESP32 data received yet', devices: [] };
                }
                const latest = await svc.getLatestByDevice(targetDevice);
                const devices = knownDevices;
                return { latest, devices };
            });
        });
        // Subscribe a socket client to real-time sensor stream for a device
        socket.on('sensor:subscribe', ({ deviceId } = {}) => {
            const room = `sensor:${deviceId || 'all'}`;
            socket.join(room);
        });
        socket.on('sensor:alerts', (_data, cb) => {
            handleSocketRPC('sensor:alerts', cb, async () => {
                const { SensorsService } = require('./services/sensors.service');
                return new SensorsService().getActiveAlerts();
            });
        });
        // AI & Analytics Endpoints over Socket
        socket.on('ai:recommendations', (kitchenId, cb) => {
            handleSocketRPC('ai:recommendations', cb, async () => {
                const { AiService } = require('./services/ai.service');
                return new AiService().getRecommendations(kitchenId);
            });
        });
        socket.on('ai:predict_demand', (input, cb) => {
            handleSocketRPC('ai:predict_demand', cb, async () => {
                const { AiService } = require('./services/ai.service');
                return new AiService().demandPrediction(input);
            });
        });
        socket.on('disconnect', () => {
            server.log.info(`[Socket.io] Client disconnected: ${socket.id}`);
        });
    });
    server.decorate('io', ioInstance);
}
//# sourceMappingURL=socket.js.map