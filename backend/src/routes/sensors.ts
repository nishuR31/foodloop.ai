import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SensorsController } from '../controllers/sensors.controller';

const ctrl = new SensorsController();

export default async function sensorsRoutes(fastify: FastifyInstance) {
  // ── Public / device routes (no auth — ESP32 calls these) ─────────────────
  /**
   * POST /api/sensors/data
   * ESP32 sends sensor payload every 5 s.
   * Returns LED + buzzer command for the device.
   */
  fastify.post('/data', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    handler: ctrl.receiveData.bind(ctrl),
  });

  /**
   * GET /api/sensors/latest
   * Latest IoT sensor status from primary device (public).
   */
  fastify.get('/latest', ctrl.getLatest.bind(ctrl));

  /**
   * GET /api/sensors/status/:deviceId
   * Latest status for a specific device (public).
   */
  fastify.get('/status/:deviceId', ctrl.getDeviceStatus.bind(ctrl));

  /**
   * GET /api/sensors/history/:deviceId?limit=50
   * Time-series history for a device (public).
   */
  fastify.get('/history/:deviceId', ctrl.getDeviceHistory.bind(ctrl));

  /**
   * GET /api/sensors/stats/:deviceId
   * Aggregated statistics for a device.
   */
  fastify.get('/stats/:deviceId', ctrl.getDeviceStats.bind(ctrl));

  /**
   * GET /api/sensors/devices
   * List all known device IDs.
   */
  fastify.get('/devices', ctrl.getKnownDevices.bind(ctrl));

  // ── Alert routes (public read, protected resolve) ─────────────────────────
  /**
   * GET /api/sensors/alerts
   * Active (unresolved) alerts from IoT detections.
   */
  fastify.get('/alerts', ctrl.getActiveAlerts.bind(ctrl));

  // ── Protected routes (dashboard users only) ───────────────────────────────
  fastify.register(async (app: FastifyInstance) => {
    app.addHook('preValidation', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify({ onlyCookie: true });
      } catch (err) {
        reply.send(err);
      }
    });

    /**
     * GET /api/sensors
     * Kitchen sensors list + latest IoT reading (authenticated).
     */
    app.get('/', ctrl.getSensors.bind(ctrl));

    /**
     * PATCH /api/sensors/alerts/:id/resolve
     * Mark an alert as resolved (authenticated).
     */
    app.patch('/alerts/:id/resolve', ctrl.resolveAlert.bind(ctrl));
  });
}
