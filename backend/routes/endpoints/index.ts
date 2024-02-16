import { Hono } from 'hono';
import { getAllDbEndpoints, getDbEndpoint } from '../../db';

const endpoints = new Hono();

endpoints.get('/', (ctx) => {
    const endpoint = ctx.req.query('endpoint');
    console.log(`Endpoint: ${endpoint}`);
    if (endpoint) {
        console.log(`Getting endpoint ${endpoint} from database`);
        const dbEndpoint = getDbEndpoint(endpoint);
        console.log(dbEndpoint);
        return ctx.json({
            endpoint: dbEndpoint,
        }, dbEndpoint ? 200 : 404);
    }

    console.log(`Getting all endpoints from database`);
    console.log(getAllDbEndpoints());
    const endpoints = getAllDbEndpoints();
    return ctx.json({
        endpoints: endpoints.map((e) => e.endpoint),
    });
})


export default endpoints;