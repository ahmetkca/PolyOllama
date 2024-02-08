
import type { ModelResponse } from "ollama";
import {
  type OllamaClient,
  getEndpointsMap,
  getEndpoints,
  getOllamaClients,
  addOllamaServer,
  killOllamaServer,
  killAllOllamaServers,
} from "./ollama.service";

import { createDbEndpoint, getAllDbEndpoints, removeDbEndpoint, getAllChats, createChat } from "./db";



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
          data: { endpoints: getEndpoints() },
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


        async function sendResponse(ollamaClient: OllamaClient, model: string) {
          const response = await ollamaClient.client.chat({
            model: model,
            stream: true,
            messages: [{
              role: "user",
              content: payload.data.message,
              images: payload.data.images,
            }],
          });
          if (!response) {
            console.log("No response from ollama client");
            return;
          }
          // generate unique id for this message chunk
          const messageChunkId = crypto.randomUUID();
          console.log(`Endpoint ${ollamaClient.endpoint} has responded with a message chunk id: ${messageChunkId}`);
          for await (const message of response) {
            ws.send(
              JSON.stringify({
                type: "on-chat-message",
                data: { message: message, messageChunkId: messageChunkId, createdAt: message.created_at },
                endpoint: ollamaClient.endpoint,
              }),
              true,
            );
          }
        }


        for (const endpoint of getEndpoints()) {
          console.log(`Checking if endpoint ${endpoint} is enabled for chat`);
          let isEndpointEnabledForChat = endpointsToChatFromPayload.get(endpoint);
          let endpointToUse: string | null = null;
          if (
            isEndpointEnabledForChat === undefined
            || (isEndpointEnabledForChat !== undefined && isEndpointEnabledForChat === false)
          ) {
            console.log(`Endpoint ${endpoint} is not enabled for chat`);
            continue;
          }
          endpointToUse = endpoint;

          // check if the endpoint has a model selected, if not, use the default model from payload.data.model, if that's not set, skip this endpoint and log a message
          const model = endpointsSelectedModel.get(endpoint);
          const modelToUse = (model && model !== "")
            ?
            model
            :
            (
              (payload.data.model && typeof payload.data.model === 'string' && payload.data.model !== "")
                ?
                payload.data.model as string
                :
                null
            );
          if (!modelToUse) {
            console.log(`Endpoint ${endpoint} doesn't have a model selected`);
            continue;
          }

          if (endpointToUse) {
            const ollamaClient = getEndpointsMap().get(endpointToUse);
            if (ollamaClient) {
              sendResponse(ollamaClient, modelToUse);
            }
          } else {
            console.log(`Endpoint ${endpoint} is enabled for chat but no Ollama client is found for it`);
          }


        }
      }
    },
    close(ws) {
      console.debug(`Closing connection with client: ${ws.data.id}`);
    },
  },
});

// Access to fetch at 'http://localhost:3000/kill-ollama-client' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource. If an opaque response serves your needs, set the request's mode to 'no-cors' to fetch the resource with CORS disabled.


const CORS_HEADERS = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  },
};

const httpServer = Bun.serve({
  hostname: host,
  port: 3000,
  fetch: async (req) => {

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      const res = new Response('Departed', CORS_HEADERS);
      return res;
    }

    // dissect the request url
    const url = new URL(req.url);

    switch (url.pathname) {
      case "/models":
        // get endpoint from query string
        const endpoint = url.searchParams.get("endpoint");
        if (endpoint) {
          const ollamaClient = getOllamaClients().ollamaClients.find((oc) => oc.endpoint === endpoint);
          if (!ollamaClient) {
            return new Response("Not found", { status: 404, headers: { ...CORS_HEADERS.headers } });
          }
          const models = await ollamaClient.client.list();
          return new Response(JSON.stringify({ models: models.models }), {
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS.headers,
            },
          });
        }

        const listResponses = await Promise.all(getOllamaClients().ollamaClients.map(async (oc) => {
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
        return new Response(JSON.stringify({ models: uniqueModels }), {
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS.headers,
          },
        });
      case "/new-ollama-client":
        if (req.method !== "POST") {
          return new Response("Method not allowed", { status: 405, headers: { ...CORS_HEADERS.headers } });
        }
        try {
          const newEndpointToOllamaServer = await addOllamaServer();
          const res = new Response(JSON.stringify({ endpoint: newEndpointToOllamaServer }), {
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS.headers,
            },
          });

          // TODO: proper error handling
          createDbEndpoint(newEndpointToOllamaServer);
          console.log(getAllDbEndpoints());
          return res;
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), {
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS.headers,
            },
          });
        }
      case "/endpoints":
        if (req.method === "GET") {
          console.log(getAllDbEndpoints());
          return new Response(JSON.stringify({ endpoints: getEndpoints() }), {
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS.headers,
            },
          });
        }
        return new Response("Method not allowed", { status: 405 });
      case "/kill-ollama-client":
        if (req.method !== "DELETE") {
          return new Response("Method not allowed", {
            status: 405,
            headers: {
              ...CORS_HEADERS.headers,
            },
          });
        }
        // body should be a JSON object with an endpoint property
        const body = await req.json() as { endpoint: string };
        if (!body.endpoint) {
          return new Response("Bad Request", { status: 400, headers: { ...CORS_HEADERS.headers } });
        }
        try {
          const success = await killOllamaServer(body.endpoint);
          if (success) {
            removeDbEndpoint(body.endpoint);
            console.log(getAllDbEndpoints())
          }
          return new Response(JSON.stringify({ success }), {
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS.headers,
            },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), {
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS.headers,
            },
          });
        }

      case "/chats":
        switch (req.method) {
          case "POST":
            const body = await req.json();
            console.log(body);
            if (!body.title) {
              return new Response("Bad Request", {
                status: 400,
                headers: {
                  ...CORS_HEADERS.headers,
                },
              });
            }
            try {
              const chatId = createChat(body.title);
              return new Response(JSON.stringify({ chatId }), {
                headers: {
                  "Content-Type": "application/json",
                  ...CORS_HEADERS.headers,
                },
              });
            } catch (e: unknown) {
              return new Response(JSON.stringify({ error: (e as Error).message }), {
                headers: {
                  "Content-Type": "application/json",
                  ...CORS_HEADERS.headers,
                },
              });
            }
            break;
          case "GET":
            try {
              const chats = getAllChats();
              console.log(chats);
              return new Response(JSON.stringify({ chats }), {
                headers: {
                  "Content-Type": "application/json",
                  ...CORS_HEADERS.headers,
                },
              });
            } catch (e: unknown) {
              return new Response(JSON.stringify({ error: (e as Error).message }), {
                headers: {
                  "Content-Type": "application/json",
                  ...CORS_HEADERS.headers,
                },
              });
            }
          default:
            return new Response("Method not allowed", { status: 405 });
        }

      default:
        return new Response("Not found", { status: 404 });
    }
  },
});



process.on("beforeExit", () => {
  server.stop();
  console.log("Goodbye!");
  try {
    console.log("Killing all ollama servers...");
    (async () => {
      await killAllOllamaServers();
    })();
  } catch (e) {
    console.log(e);
  }
});

console.debug(`Listening on ws://${host}:${port}`);
