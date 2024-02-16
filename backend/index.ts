import app from './routes';
import type { ChatResponse, ModelResponse, Ollama } from "ollama";
// import {
//     type OllamaClient,
//     getEndpointsMap,
//     getEndpoints,
//     getOllamaClients,
//     addOllamaServer,
//     killOllamaServer,
//     killAllOllamaServers,
// } from "./ollama.service";

import { ollamaServerManager } from './new.ollama.service';

import {
    createDbEndpoint,
    getAllDbEndpoints,
    removeDbEndpoint,
    getAllChats,
    createChat,
    createConversation,
    getDbEndpoint,
    getConversationsByChatId
    , getEndpointByConversationId,
    getConversationByChatIdAndEndpoint,
    addMessageToConversation,
    getMessagesByConversationId,
    updateMessageMetricsByMessageId,
    updateChatTitle
} from "./db";
import { getEndpointsByChatId, removeAllDbEndpoints } from './db/endpoints';
import { calculateMessageMetrics, extractChatTitleFromChatResponse } from './utils';

const CREATE_TITLE_FROM_CONVERSATION_PROMPT_PATH = "./prompts/create-title-from-conversation.txt";
const createTitleFromConversationPrompt = await Bun.file(CREATE_TITLE_FROM_CONVERSATION_PROMPT_PATH).text();


const host = "0.0.0.0";
const port = 3333;

const server = Bun.serve<{ id: string; createdAt: string }>({
    hostname: host,
    port: port,
    fetch: (req, server) => {
        const clientId = crypto.randomUUID();
        server.upgrade(req, {
            data: {
                id: clientId,
                createdAt: Date(),
            },
        });
        return new Response("Upgrade Failed", { status: 500 });
    },
    websocket: {
        open(ws) {
            console.debug(`Client connected: ${ws.data.id}`);

            // upon successful connection, send the list of endpoints to the client
            ws.send(
                JSON.stringify({
                    type: "register-endpoints",
                    data: { endpoints: ollamaServerManager.list().map((os) => os.endpoint) },
                    endpoint: null,
                }),
                true,
            );
        },
        message: (ws, message) => {
            function reviver(key: string, value: any): any {
                if (value && value.type === 'Uint8Array') {
                    return new Uint8Array(value.data);
                }
                return value;
            }

            const payload = JSON.parse(message as string, reviver);

            // console.log(payload);

            if (payload.type === "chat-message") {
                // data: {
                //   // isFirstMessage is used to determine if this is first time the user is sending a message to the associated chat.
                //   isFirstMessage: true,

                //   // currently, the chatId is not used.
                //   // if there is no chatId, it means we have to create a new chat
                //   chatId: newChatId,
                //   message: msg,
                //   model: model,
                //   images: imagesToSend, // imagesToSend is Uint8Array[] or undefined
                //   // Map is not serializable. Convert to array of objects
                //   endpointsToChat: Array.from(endpointsToChat.entries()).map(([endpoint, isEnabled]) => {
                //     return { endpoint, isEnabled }
                //   }),
                //   endpointsSelectedModel: Array.from(endpointsSelectedModel.entries()).map(([endpoint, model]) => {
                //     return { endpoint, model }
                //   }),
                // },

                const isFirstChatMessage = payload.data.isFirstMessage;
                if (isFirstChatMessage === undefined || isFirstChatMessage === null || typeof isFirstChatMessage !== 'boolean') {
                    console.log(`${isFirstChatMessage}`);
                    console.log("isFirstChatMessage is not set or is not a boolean");
                    return;
                }
                const chatId = payload.data.chatId;
                if (chatId === undefined || chatId === null || typeof chatId !== 'number') {
                    console.log("chatId is not set or is not a number");
                    return;
                }

                const endpointsToChatFromPayload: Map<string, boolean> = new Map();
                console.log(payload.data.endpointsToChat);
                if (
                    payload.data.endpointsToChat
                    && Array.isArray(payload.data.endpointsToChat)
                    && payload.data.endpointsToChat.every((item: any) => {
                        return typeof item === 'object' &&
                            item !== null &&
                            'endpoint' in item && typeof item.endpoint === 'string' &&
                            'isEnabled' in item && typeof item.isEnabled === 'boolean';
                    })
                ) {
                    for (const endpointToChat of (payload.data.endpointsToChat as { endpoint: string; isEnabled: boolean }[])) {
                        endpointsToChatFromPayload.set(endpointToChat.endpoint, endpointToChat.isEnabled);
                    }
                }
                const endpointsSelectedModel: Map<string, string> = new Map();
                console.log(payload.data.endpointsSelectedModel);
                if (
                    payload.data.endpointsSelectedModel
                    && Array.isArray(payload.data.endpointsSelectedModel)
                    && payload.data.endpointsSelectedModel.every((item: any) => {
                        return typeof item === 'object' &&
                            item !== null &&
                            'endpoint' in item && typeof item.endpoint === 'string' &&
                            'model' in item && typeof item.model === 'string';
                    })
                ) {
                    for (const endpointSelectedModel of (payload.data.endpointsSelectedModel as { endpoint: string; model: string }[])) {
                        endpointsSelectedModel.set(endpointSelectedModel.endpoint, endpointSelectedModel.model);
                    }
                }


                async function sendResponse(
                    ollamaServer: { endpoint: string; client: Ollama; }, model: string,
                    endpoint: string, chatId: number, isFirstChatMessage: boolean
                ) {
                    // find conversation_id that is associated with chatId and endpoint.
                    const conversation = getConversationByChatIdAndEndpoint(chatId, endpoint);
                    if (!conversation) {
                        console.log(`No conversation found for chatId: ${chatId} and endpoint: ${endpoint}. Skipping...`);
                        return;
                    }
                    // add a new message to the conversation.
                    console.log(`Adding user message to conversation ${conversation.conversation_id}`);
                    addMessageToConversation(conversation.conversation_id, {
                        content: payload.data.message,
                        image: payload.data?.images?.[0] || null,
                        role: "user",
                    })

                    const messagesSoFar = getMessagesByConversationId(conversation.conversation_id);

                    const response = await ollamaServer.client.chat({
                        model: model,
                        stream: true,
                        messages: [
                            ...messagesSoFar.map((message) => ({
                                content: message.content,
                                role: message.role,
                                images: message.image !== null ? [message.image] : undefined,
                            })),
                        ],
                    });
                    if (!response) {
                        console.log("No response from ollama client");
                        return;
                    }

                    // response is an async iterable
                    // send part of each message to the client
                    // after sending all of the parts of the message, store the endpoint response in the database using conversation_id
                    const fullMessage: Partial<ChatResponse['message']> = {};
                    fullMessage.content = "";
                    fullMessage.role = "Unknown";

                    const messageParts: string[] = [];
                    // generate unique id for this message chunk
                    const messageChunkId = crypto.randomUUID();
                    let calculatedMsgMetrics: ReturnType<typeof calculateMessageMetrics> | null = null;
                    console.log(`Endpoint ${ollamaServer.endpoint} (model: ${model}) responded with message chunk id: ${messageChunkId}`);
                    for await (const message of response) {
                        if (message.done) {
                            calculatedMsgMetrics = calculateMessageMetrics({
                                total_duration: message.total_duration,
                                load_duration: message.load_duration,
                                eval_count: message.eval_count,
                                eval_duration: message.eval_duration,
                                prompt_eval_count: message.prompt_eval_count,
                                prompt_eval_duration: message.prompt_eval_duration,
                            });
                        }

                        // not supported yet
                        // fullMessage.images = message.message.images;

                        fullMessage.role = message.message.role;
                        messageParts.push(message.message.content);
                        ws.send(
                            JSON.stringify({
                                type: "on-chat-message",
                                data: {
                                    message: message,
                                    messageMetrics: calculatedMsgMetrics,
                                    messageChunkId: messageChunkId,
                                    createdAt: message.created_at
                                },
                                endpoint: ollamaServer.endpoint,
                            }),
                            true,
                        );
                    }
                    fullMessage.content = messageParts.join("");

                    // store the message in the database
                    console.log(`Adding ollama model message to conversation ${conversation.conversation_id}`);
                    const newInsertedMsgId = addMessageToConversation(conversation.conversation_id, {
                        content: fullMessage.content,
                        role: fullMessage.role as "user" | "assistant" | "system",
                        image: null, // not supported yet
                    });
                    if (newInsertedMsgId && calculatedMsgMetrics) {
                        updateMessageMetricsByMessageId(newInsertedMsgId, calculatedMsgMetrics);
                    }

                    const messagesToCreateTitle = getMessagesByConversationId(conversation.conversation_id);

                    return { finishTime: Date.now(), ollamaServer, model, chatId, isFirstChatMessage, messages: messagesToCreateTitle };
                }

                const endpointsByChatId = getEndpointsByChatId(chatId);
                // getAllDbEndpoints()
                const promises = endpointsByChatId.map((dbEndpoint) => {
                    const { endpoint_id: _, endpoint } = dbEndpoint;
                    console.log(`Checking if endpoint ${endpoint} is enabled for chat`);
                    let isEndpointEnabledForChat = endpointsToChatFromPayload.get(endpoint);
                    let endpointToUse: string | null = null;
                    if (
                        isEndpointEnabledForChat === undefined
                        || (isEndpointEnabledForChat !== undefined && isEndpointEnabledForChat === false)
                    ) {
                        console.log(`Endpoint ${endpoint} is not enabled for chat`);
                        return;
                    }
                    endpointToUse = endpoint;

                    // check if the endpoint has a model selected, if not, skip this endpoint and log a message
                    const model = endpointsSelectedModel.get(endpoint);
                    const modelToUse = (model && model !== "")
                        ?
                        model
                        :
                        null;
                    // (
                    //     (payload.data.model && typeof payload.data.model === 'string' && payload.data.model !== "")
                    //         ?
                    //         payload.data.model as string
                    //         :
                    //         null
                    // );
                    if (!modelToUse) {
                        console.log(`Endpoint ${endpoint} doesn't have a model selected`);
                        return;
                    }

                    if (endpointToUse) {
                        const ollamaClient = ollamaServerManager.get(endpointToUse);
                        if (ollamaClient) {
                            console.log(`Sending response to client for endpoint ${endpoint}, model: ${modelToUse}, chatId: ${chatId}, isFirstChatMessage: ${isFirstChatMessage}`);
                            return sendResponse(ollamaClient, modelToUse, endpoint, chatId, isFirstChatMessage);
                        }
                    } else {
                        console.log(`Endpoint ${endpoint} is enabled for chat but no Ollama client is found for it`);
                    }
                });

                Promise.all(promises.filter((p) => p !== undefined))
                    .then(async (results) => {
                        console.log(`All responses have been sent to the client`);
                        let lastResult: Awaited<ReturnType<typeof sendResponse>> | null = null;
                        for (const result of results) {
                            if (!lastResult) {
                                lastResult = result;
                                continue;
                            }
                            if (result) {
                                if (result.finishTime > lastResult.finishTime) {
                                    lastResult = result;
                                }

                            }
                        }
                        console.log(`LAST RESULT:`);
                        if (lastResult) {
                            console.log(`LAST RESULT:`);
                            console.log(lastResult);
                            if (lastResult.isFirstChatMessage) {
                                const conversationText = `${'\n'}Here is the conversation between user and assistant:\n"""${'\n'}${lastResult.messages
                                    .map(message => `${message.role}: ${message.content}`)
                                    .join('\n')}${'\n'}"""${'\n'}Deliver a single short concise simple meaningful title that you determine to be the most appropriate summary of the above conversation.${'\n'}Provide your response in the following YAML format:${'\n'}\`\`\`yaml${'\n'}title: "<Your single, most appropriate title here>"${'\n'}\`\`\`${'\n'}`;
                                console.log(conversationText);

                                const MAX_CHAT_TITLE_CREATION_ATTEMPTS = 10;
                                let chatTitleCreationAttempt = 0;
                                let chatTitleCreationSuccess = false;
                                while (chatTitleCreationAttempt < MAX_CHAT_TITLE_CREATION_ATTEMPTS) {
                                    const chatTitleResponse = await lastResult.ollamaServer.client.chat({
                                        model: lastResult.model,
                                        messages: [
                                            { role: "system", content: createTitleFromConversationPrompt },
                                            { role: "user", content: conversationText }
                                        ],
                                        stream: false,
                                    });
                                    console.log(`Chat title attempt: ${chatTitleResponse.message.content}`);
                                    // if (!chatTitleResponse.message.content.startsWith("title: \"") && !chatTitleResponse.message.content.endsWith("\"")) {
                                    //     chatTitleCreationAttempt++;
                                    //     console.log(`Chat title creation attempt ${chatTitleCreationAttempt}/${MAX_CHAT_TITLE_CREATION_ATTEMPTS} failed. Retrying...`);
                                    //     continue;
                                    // }
                                    // let chatTitle = chatTitleResponse.message.content.replace("title: \"", "");
                                    // // only remove the last double quote
                                    // chatTitle = chatTitle.substring(0, chatTitle.length - 1);
                                    const chatTitle = extractChatTitleFromChatResponse(chatTitleResponse.message.content);
                                    if (!chatTitle) {
                                        chatTitleCreationAttempt++;
                                        console.log(`Chat title creation attempt ${chatTitleCreationAttempt}/${MAX_CHAT_TITLE_CREATION_ATTEMPTS} failed. Retrying...`);
                                        continue;
                                    }

                                    // update the chat title in the database
                                    updateChatTitle(lastResult.chatId, chatTitle);
                                    ws.send(
                                        JSON.stringify({
                                            type: 'on-chat-title-created',
                                            data: {
                                                chatId: lastResult.chatId,
                                                title: chatTitle,
                                            },
                                            endpoint: lastResult.ollamaServer.endpoint,
                                        })
                                    );
                                    console.log(`Chat title created: ${chatTitle}`);
                                    chatTitleCreationSuccess = true;
                                    break;
                                }
                                if (!chatTitleCreationSuccess) {
                                    console.error(`Chat title creation failed after ${MAX_CHAT_TITLE_CREATION_ATTEMPTS} attempts.`);
                                }
                            }
                        }
                    });


            }
        },
        close(ws) {
            console.debug(`Closing connection with client: ${ws.data.id}`);
        },
    },
});




const HTTP_PORT = 3000;
const httpServer = Bun.serve({
    hostname: host,
    port: HTTP_PORT,
    fetch: app.fetch,

});


const MAX_RETRY_ON_CLEANUP = 5;
const cleanUpAndExit = async () => {
    // removeAllDbEndpoints();
    let retry = 0;
    while (retry < MAX_RETRY_ON_CLEANUP) {
        try {
            console.log(`Killing all Ollama servers... Attempt ${retry + 1}/${MAX_RETRY_ON_CLEANUP}`);
            const statuses = await ollamaServerManager.removeAll();

            console.log(statuses);
            // for (const status of statuses) {
            //     if (status.success) {
            //         removeDbEndpoint(status.endpoint);
            //     }
            // }
            // break;
            if (statuses.every((status) => status.success)) {
                // if all servers were killed successfully, break out of the loop
                break;
            }
        } catch (e: unknown) {
            console.error(e);
            retry++;
        }
    }

    server.stop();
    httpServer.stop();
    console.log("Goodbye!");
}

async function handleExit(signal: string) {
    console.log(`Received ${signal}, cleaning up...`);
    await cleanUpAndExit();
    console.log('Cleanup completed, exiting now.');
    process.exit();
}


process.on('SIGINT', handleExit.bind(null, 'SIGINT'));
process.on('SIGTERM', handleExit.bind(null, 'SIGTERM'));

process.on('uncaughtException', async (err) => {
    console.error('There was an uncaught error', err);
    await cleanUpAndExit();
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    await cleanUpAndExit();
    process.exit(1);
});

process.on('beforeExit', async () => {
    removeAllDbEndpoints();
    console.log('Goodbye!');
    await cleanUpAndExit();
    process.exit();
});

console.debug(`Listening on ws://${host}:${port}`);
console.debug(`Listening on http://${host}:${HTTP_PORT}`);

