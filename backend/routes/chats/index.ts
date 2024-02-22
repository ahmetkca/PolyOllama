import { Hono } from 'hono';
import {
    assignEndpointToConversation,
    createChat,
    deleteChat,
    getAllChats,
    getAllNonAssignedEndpointsByChatId,
    getChatByChatId,
    getConversationsByChatId,
    getEndpointByConversationId
} from '../../db';
import { ollamaServerManager } from '../../new.ollama.service';
import { retryOperation } from '../../utils';

const chats = new Hono();

chats.post('/', async (ctx) => {
    const body = await ctx.req.json();
    // console.log(body);
    if (!body.title) {
        return ctx.json({ error: "No title provided" }, 400);
    }
    try {
        const chat_id = createChat(body.title);
        return ctx.json({ chat_id }, chat_id ? 201 : 500);
    } catch (e: any) {
        return ctx.json({ error: e.message }, 500);
    }
});

chats.get('/', (ctx) => {
    // console.log(`${ctx.req.url}, ${ctx.req.method}, Getting all chats...`);
    try {
        const chats = getAllChats();
        const conversationsByChats = chats.map((chat) => {
            return getConversationsByChatId(chat.chat_id);
        })
        // console.log(chats);
        const chatsWithConversations = chats.map((chat, index) => {
            return {
                ...chat,
                conversations: conversationsByChats[index]
            }
        });

        const chatsWithConversationsAndEndpoints = chatsWithConversations.map((chat) => {
            const conversationsWithEndpoint = chat.conversations.map((conv) => {
                const endpointFromDb = getEndpointByConversationId(conv.conversation_id);
                return {
                    ...conv,
                    endpoint: endpointFromDb ? endpointFromDb.endpoint : null
                }
            })
            return {
                ...chat,
                conversations: conversationsWithEndpoint
            }
        });


        return ctx.json({ chats: chatsWithConversationsAndEndpoints });
    } catch (e: any) {
        return ctx.json({ error: e.message }, 500);
    }
});

chats.get('/:chatId', (ctx) => {
    const chatIdStr = ctx.req.param('chatId');
    if (!chatIdStr) {
        return ctx.json({ error: "No chatId provided" }, 400);
    }
    const chatId = parseInt(chatIdStr);
    if (isNaN(chatId)) {
        return ctx.json({ error: "Invalid chatId" }, 400);
    }
    const chat = getChatByChatId(chatId);
    if (!chat) {
        return ctx.json({ error: "Chat not found" }, 404);
    }
    const conversations = getConversationsByChatId(chatId);
    // get endpoints for each conversation
    const conversationsWithEndpoint = conversations.map((conv) => {
        const endpointFromDb = getEndpointByConversationId(conv.conversation_id);
        return {
            ...conv,
            endpoint: endpointFromDb ? endpointFromDb.endpoint : null
        }
    })

    const a = { chat: { ...chat, conversations: conversationsWithEndpoint } };
    // console.log(a);
    return ctx.json({ chat: { ...chat, conversations: conversationsWithEndpoint } });
});

chats.delete('/:chatId', (ctx) => {
    // console.log(`${ctx.req.url}, ${ctx.req.method}, Deleting chat...`)
    const chatIdStr = ctx.req.param('chatId');
    if (!chatIdStr) {
        return ctx.json({ error: "No chatId provided" }, 400);
    }
    const chatId = parseInt(chatIdStr);
    if (isNaN(chatId)) {
        return ctx.json({ error: "Invalid chatId" }, 400);
    }

    try {
        const success = deleteChat(chatId);
        return ctx.json({ success });
    } catch (e: any) {
        return ctx.json({ error: e.message }, 500);
    }
});

chats.put('/:chatId/assign-endpoints-to-conversations', async (ctx) => {
    // console.log(`${ctx.req.url}, ${ctx.req.method}, Assigning endpoints to conversations...`);
    const chatIdStr = ctx.req.param('chatId');
    const chatId = parseInt(chatIdStr);
    if (isNaN(chatId)) {
        return ctx.json({ error: "Invalid chatId" }, 400);
    }
    const body = await ctx.req.json();
    if (!body.endpoints) {
        return ctx.json({ error: "No endpoints provided" }, 400);
    }
    if (!Array.isArray(body.endpoints)) {
        return ctx.json({ error: "Endpoints must be an array" }, 400);
    }
    // console.log(`Endpoints from body: ${body.endpoints}`);
    const conversations = getConversationsByChatId(chatId);
    const conversationsWithoutEndpoint = conversations.filter((conversation) => conversation.endpoint_id === null);
    // console.log(`There are ${conversationsWithoutEndpoint.length} conversations without an endpoint.`);

    const unassignedEndpointsFromDb = getAllNonAssignedEndpointsByChatId(chatId);
    // console.log(`Got ${unassignedEndpointsFromDb.length} unassigned endpoints from the database.`);
    const unassignedEndpoints = unassignedEndpointsFromDb.filter((endpoint) => body.endpoints.includes(endpoint.endpoint));
    // console.log(`Only ${unassignedEndpoints.length} of the unassigned endpoints are in the body.`);

    // get models from each ollama server using endpoints
    const endpointsWithModels = (await Promise.all(
        unassignedEndpoints.map(async ({ endpoint }) => {
            const server = ollamaServerManager.get(endpoint);
            if (!server) {
                return null;
            }
            const models = await retryOperation(async () => await server.client.list(), 5, 500, 2000);
            return { endpoint, models: models.models.map(model => model.name) };
        })
    )).filter((models) => models !== null) as { endpoint: string; models: string[] }[];

    const assignedEndpointsWithConversations: { conversation_id: number; endpoint_id: number; }[] = [];
    for (const { model, conversation_id } of conversationsWithoutEndpoint) {
        let assigned = false;
        for (const { endpoint, endpoint_id } of unassignedEndpoints) {
            // check if the model is available in the endpoint
            const endpointWithModel = endpointsWithModels.find((ep) => ep.endpoint === endpoint);
            if (!endpointWithModel) {
                // console.log(`Endpoint ${endpoint} does not have any models.`)
                continue;
            }
            if (endpointWithModel.models.includes(model)) {

                if (assignEndpointToConversation(conversation_id, endpoint_id)) {
                    assigned = true;
                    assignedEndpointsWithConversations.push({ conversation_id, endpoint_id });
                    // console.log(`Assigning endpoint ${endpoint} to conversation ${model}`);
                    break;
                }
            }
        }
        if (!assigned) {
            console.log(`Failed to assign endpoint to conversation ${model}`);
        }
    }
    // console.log(`Assigned ${assignedEndpointsWithConversations.length}/${conversationsWithoutEndpoint.length} endpoints to conversations.`);
    return ctx.json({ conversationsWithAssignedEndpoints: assignedEndpointsWithConversations });
});



export default chats;