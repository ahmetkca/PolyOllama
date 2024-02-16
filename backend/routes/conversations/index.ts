import { Hono } from 'hono';
import { createConversation, getConversationsByChatId, getEndpointByConversationId, getMessageByConversationIdAndMessageId, getMessagesByConversationId } from '../../db';
import { getConversationByConversationIdChatIdAndEndpoint } from '../../db';

const conversations = new Hono();



conversations.post('/', async (ctx) => {
    console.log(`${ctx.req.url}, ${ctx.req.method}, Creating new conversation...`)
    const body = await ctx.req.json();
    console.log(body);
    if (!(body.model && typeof body.model === "string" && body.model !== "")
        || !(body.chatId && typeof body.chatId === "number")
        || !(body.endpointId && typeof body.endpointId === "number")
    ) {
        return ctx.json({ error: "Invalid request body" }, 400);
    }
    const conversation_id = createConversation(body.model, body.chatId, body.endpointId);
    return ctx.json({ success: conversation_id !== undefined, conversation_id }, conversation_id ? 201 : 500);
});

conversations.get('/', async (ctx) => {
    const chatId = ctx.req.query("chatId");
    if (!chatId || isNaN(parseInt(chatId))) {
        return ctx.json({ error: "Invalid chatId" }, 400);
    }
    // get conversations for chatId
    const conversations = getConversationsByChatId(parseInt(chatId));
    // ReturnType<typeof getConversationsByChatId> and I also want to add a new property to each conversation object called endpoint
    type ConversationWithEndpoint = ReturnType<typeof getConversationsByChatId>[0] & { endpoint: string | null };
    const newConversations: ConversationWithEndpoint[] = [];
    for (const conversation of conversations) {
        const eps = getEndpointByConversationId(conversation.conversation_id);
        // conversation's endpoint_id might be null,
        const ep = eps ? eps : null;
        newConversations.push({ ...conversation, endpoint: ep ? ep.endpoint : null });
    }
    return ctx.json({ conversations: newConversations });
});

conversations.get('/:conversationId', async (ctx) => {
    const conversationIdStr = ctx.req.param('conversationId');
    const conversationId = parseInt(conversationIdStr);
    const chatIdStr = ctx.req.query("chatId");
    const endpoint = ctx.req.query("endpoint");
    if (!conversationIdStr || isNaN(conversationId)) {
        return ctx.json({ error: "Invalid conversationId" }, 400);
    }
    if (!chatIdStr || isNaN(parseInt(chatIdStr))) {
        return ctx.json({ error: "Invalid chatId" }, 400);
    }
    if (!endpoint) {
        return ctx.json({ error: "Invalid endpoint" }, 400);
    }


    const conversation = getConversationByConversationIdChatIdAndEndpoint(conversationId, parseInt(chatIdStr), endpoint);

    if (!conversation) {
        return ctx.json({ error: "Conversation not found" }, 404);
    }
    return ctx.json({ conversation });
});

conversations.get('/:conversationId/messages', async (ctx) => {
    console.log(`${ctx.req.url}, ${ctx.req.method}, Getting messages for conversation...`);
    const conversationIdStr = ctx.req.param('conversationId');
    // const chatId = ctx.req.query("chatId");
    // const endpoint = ctx.req.query("endpoint");
    // const endpointId = ctx.req.query("endpointId");
    // console.log(`chatId: ${chatId}, endpoint: ${endpoint}, endpointId: ${endpointId}, conversationId: ${conversationIdStr}`)
    if (!conversationIdStr || isNaN(parseInt(conversationIdStr))) {
        return ctx.json({ error: "Invalid conversationId" }, 400);
    }
    const conversationId = parseInt(conversationIdStr);

    const endpoint = getEndpointByConversationId(conversationId);

    if (endpoint === null) {
        return ctx.json({ error: "Endpoint not found. Conversation needs an endpoint" }, 404);
    }

    // get messages for conversationId
    const messages = getMessagesByConversationId(conversationId);
    // console.log(`Messages:`);
    // console.log(messages);
    return ctx.json({ messages });
});

conversations.get('/:conversationId/messages/:messageId', async (ctx) => {
    const messageIdStr = ctx.req.param('messageId');
    const conversationIdStr = ctx.req.param('conversationId');
    if (messageIdStr === undefined || messageIdStr === null || messageIdStr === "") {
        return ctx.json({ error: "Invalid messageId" }, 400);
    }
    const messageId = messageIdStr;
    if (!conversationIdStr || isNaN(parseInt(conversationIdStr))) {
        return ctx.json({ error: "Invalid conversationId" }, 400);
    }
    const conversationId = parseInt(conversationIdStr);
    // get message for messageId and conversationId
    const message = getMessageByConversationIdAndMessageId(conversationId, messageId);
    if (!message) {
        return ctx.json({ error: "Message not found" }, 404);
    }
    return ctx.json({ message });
});



export default conversations;