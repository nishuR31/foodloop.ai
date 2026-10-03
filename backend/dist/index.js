"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const client_1 = require("@prisma/client");
const helmet_1 = __importDefault(require("@fastify/helmet"));
const cookie_1 = __importDefault(require("@fastify/cookie"));
const compress_1 = __importDefault(require("@fastify/compress"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const zod_1 = require("zod");
const split2_1 = __importDefault(require("split2"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const routes_1 = __importDefault(require("./routes"));
const auth_1 = __importDefault(require("./plugins/auth"));
const socket_1 = require("./socket");
const logStream = (0, split2_1.default)((line) => {
    try {
        const logObj = JSON.parse(line);
        const msg = `[${new Date(logObj.time || Date.now()).toISOString()}] ${logObj.level >= 40 ? 'ERROR' : 'INFO'}: ${logObj.msg || ''}`;
        const io = (0, socket_1.getIO)();
        if (io) {
            io.emit('syslog', msg);
        }
        process.stdout.write(line + '\n');
    }
    catch (e) {
        process.stdout.write(line + '\n');
    }
});
const server = (0, fastify_1.default)({ logger: { stream: logStream, level: 'info' }, bodyLimit: 15 * 1024 * 1024 });
const prisma = new client_1.PrismaClient();
server.register(rate_limit_1.default, {
    max: 100,
    timeWindow: '1 minute'
});
server.register(helmet_1.default, { global: true, contentSecurityPolicy: false });
server.register(cors_1.default, {
    origin: (origin, cb) => {
        if (!origin)
            return cb(null, true);
        const allowed = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];
        if (allowed.includes(origin) || origin.startsWith('http://localhost:') || origin.endsWith('.vercel.app')) {
            return cb(null, true);
        }
        cb(null, false);
    },
    credentials: true
});
server.register(cookie_1.default, {
    secret: process.env.COOKIE_SECRET || 'my-cookie-secret',
    hook: 'onRequest'
});
server.register(compress_1.default, { global: true });
server.register(multipart_1.default, {
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB limit
    }
});
server.register(swagger_1.default, {
    openapi: {
        info: {
            title: 'FoodLoop AI API Documentation',
            description: 'OpenAPI documentation for FoodLoop AI Backend endpoints',
            version: '1.0.0'
        },
        servers: [
            { url: 'http://localhost:3001', description: 'Local Backend Server' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    }
});
server.register(swagger_ui_1.default, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'list',
        deepLinking: false
    }
});
server.get('/swagger', async (request, reply) => {
    return reply.redirect('/docs');
});
server.addHook('onSend', (request, reply, payload, done) => {
    if (request.method === 'GET' && !request.url.startsWith('/documentation')) {
        reply.header('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=59');
    }
    done();
});
server.register(jwt_1.default, {
    secret: process.env.JWT_SECRET || 'supersecret',
    cookie: {
        cookieName: 'accessToken',
        signed: false
    }
});
server.register(auth_1.default);
server.register(routes_1.default, { prefix: '/api' });
// Health check routes
server.get('/', async (request, reply) => {
    return { status: 'ok', service: 'FoodLoop Backend API', timestamp: new Date() };
});
server.get('/ping', async (request, reply) => {
    return { ping: 'pong', timestamp: new Date() };
});
server.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date() };
});
server.get('/api/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date() };
});
// Global error handler
server.setErrorHandler((error, request, reply) => {
    server.log.error(error);
    if (error instanceof zod_1.z.ZodError) {
        return reply.status(400).send({
            success: false,
            message: 'Validation Error',
            errors: error.issues
        });
    }
    if (error.validation) {
        return reply.status(400).send({
            success: false,
            message: 'Validation Error',
            errors: error.validation
        });
    }
    let statusCode = error.statusCode || 500;
    if (!error.statusCode) {
        const msg = error.message || '';
        if (msg.includes('Invalid credentials') || msg.includes('Unauthorized') || msg.includes('expired token'))
            statusCode = 401;
        else if (msg.includes('Forbidden'))
            statusCode = 403;
        else if (msg.includes('not found') || msg.includes('Not found'))
            statusCode = 404;
        else if (msg.includes('already exists'))
            statusCode = 409;
        else if (msg.includes('Validation'))
            statusCode = 400;
    }
    reply.status(statusCode).send({
        success: false,
        error: { message: statusCode === 500 ? 'Internal Server Error' : error.message },
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});
const start = async () => {
    try {
        (0, socket_1.setupSocket)(server);
        await server.ready();
        await server.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' });
        server.log.info(`Server running on port ${process.env.PORT || 3001}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map