import { Hono } from 'hono';
import { cors } from 'hono/cors'

import chatsRouter from './chats';
import conversationsRouter from './conversations';
import endpointsRouter from './endpoints';
import modelsRouter from './models';
import { createDbEndpoint, getAllDbEndpoints, removeDbEndpoint } from '../db';
import { ollamaServerManager } from '../new.ollama.service';
// import { addOllamaServer, killOllamaServer } from '../ollama.service';


const app = new Hono();
app.use(cors());

app.route('/chats', chatsRouter);
app.route('/conversations', conversationsRouter);
app.route('/endpoints', endpointsRouter);
app.route('/models', modelsRouter);



app.get('/', (c) => c.text('Hello, world!'));
app.delete('/kill-ollama-client', async (c, next) => {
    const body = await c.req.json() as { endpoint: string };
    if (!body.endpoint) {
        return c.json({ error: "No endpoint provided" }, 400);
    }
    try {
        const success = await ollamaServerManager.remove(body.endpoint);
        if (success) {
            // removeDbEndpoint(body.endpoint);
            console.log("Removed endpoint", body.endpoint);
            console.log(getAllDbEndpoints())
        }
        return c.json({ success });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});


app.post('/new-ollama-client', async (ctx) => {
    try {
        const newEndpointToOllamaServer = await ollamaServerManager.add();
        if (!newEndpointToOllamaServer) {
            return ctx.json({ error: "Failed to add ollama server" }, 500);
        }

        const res = ctx.json({ endpoint: newEndpointToOllamaServer }, 201);
        return res;
    } catch (e: any) {
        return ctx.json({ error: e.message }, 500);
    }
})



export default app;

