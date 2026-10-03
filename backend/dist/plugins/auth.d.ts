import { FastifyInstance } from 'fastify';
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        requireRoles: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}
declare const _default: (fastify: FastifyInstance) => Promise<void>;
export default _default;
//# sourceMappingURL=auth.d.ts.map