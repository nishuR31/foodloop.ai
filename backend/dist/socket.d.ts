import { Server } from 'socket.io';
import { FastifyInstance } from 'fastify';
declare let ioInstance: Server | null;
export declare function getIO(): Server | null;
export declare function setupSocket(server: FastifyInstance): void;
export { ioInstance as io };
//# sourceMappingURL=socket.d.ts.map