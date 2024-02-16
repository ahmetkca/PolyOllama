import { Hono } from 'hono';
import { ollamaServerManager } from '../../new.ollama.service';
import type { ModelResponse } from 'ollama';

const models = new Hono();

models.get('/', async (ctx) => {
    // get endpoint from query string
    const endpoint = ctx.req.query('endpoint');
    if (endpoint) {
        const ollamaClient = ollamaServerManager.get(endpoint);
        if (!ollamaClient) {
            return ctx.json({ error: "No such endpoint" }, 404);
        }
        const models = await ollamaClient.client.list();
        return ctx.json({ models: models.models });
    }

    const listResponses = await Promise.all(ollamaServerManager.list().map(async (oc) => {
        return oc.client.list();
    }));
    // listResponses is an array of { models: ModelResponse[] }
    // we need to combine all the models into one array
    const allModels = listResponses.flatMap((lr) => lr.models);
    function uniqueByName(objects: ModelResponse[]): ModelResponse[] {
        const seenNames = new Set<string>();
        return objects.filter(obj => {
            if (seenNames.has(obj.name)) {
                return false;
            }
            seenNames.add(obj.name);
            return true;
        });
    }
    const uniqueModels = uniqueByName(allModels);
    return ctx.json({ models: uniqueModels });
});

export default models;