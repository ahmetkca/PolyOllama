import { spawn, type Subprocess } from "bun";
import { Ollama } from "ollama";
import { createDbEndpoint, removeDbEndpoint } from "./db";


async function isPortAvailable(port: number) {
    return new Promise((resolve, reject) => {
        try {
            const tester = Bun.serve({
                hostname: "0.0.0.0",
                port: port,
                fetch: async (req) => {
                    return new Response("You shouldn't see this", { status: 200 });
                },
            });
            tester.stop();
            resolve(true);
        } catch (e: any) {
            if (e.code === "EADDRINUSE") {
                resolve(false);
            } else {
                reject(e);
            }
        }
    });
}



type OllamaServer = {
    subprocess: Subprocess;
    client: Ollama;
    endpoint: string;


};

type OllamaManager = {
    add: () => Promise<string | undefined>;
    remove: (id: string) => Promise<boolean>;
    list: () => OllamaServer[];
    get: (id: string) => OllamaServer | undefined;
    removeAll: () => Promise<{ endpoint: string; success: boolean }[]>;

    abortCurrentlyRunningChat: () => void;
    addRunningOllamaServer: (chatId: number, endpoint: string) => AbortSignal;
    removeRunningOllamaServer: (chatId: number, endpoint: string) => void;
    clearRunningOllamaServers: () => void;
};

function createOllamaServerManager(): OllamaManager {
    const ollamaServers: Map<string, OllamaServer> = new Map();

    const currentlyRespondingOllamaServers: Map<`${string}-${number}`, { abortController: AbortController }> = new Map();
    const abortCurrentlyRunningChat = () => {
        // console.log("Aborting currently running chat", currentlyRespondingOllamaServers);
        for (const [_, { abortController }] of currentlyRespondingOllamaServers) {
            // abort with reason "stopped currently running chat"
            // console.log(`Aborting chat with key ${key}`);
            abortController.abort();
        }
    };
    const addRunningOllamaServer = (chatId: number, endpoint: string) => {
        const abortController = new AbortController();
        currentlyRespondingOllamaServers.set(`${endpoint}-${chatId}`, { abortController });
        return abortController.signal;
    }
    const removeRunningOllamaServer = (chatId: number, endpoint: string) => {
        currentlyRespondingOllamaServers.delete(`${endpoint}-${chatId}`);
    }
    const clearRunningOllamaServers = () => {
        currentlyRespondingOllamaServers.clear();
    }


    const add = async () => {
        const DEFAULT_START_PORT = 11434;

        const port = Math.max(
            ...Array.from(ollamaServers.keys()).map((endpoint) => parseInt(endpoint.split(":")[2])),
            DEFAULT_START_PORT,
        );
        const MAX_TRIES = 100;
        let nextPort = port + 1;
        while (true) {
            if (nextPort - port > MAX_TRIES) {
                throw new Error("No available port found");
            }
            if (await isPortAvailable(nextPort)) {
                break;
            }
            nextPort++;
        }

        const newEndpoint = `http://127.0.0.1:${nextPort}`;
        console.log("Starting new ollama server on", newEndpoint);
        const proc = spawn(["ollama", "serve"], {
            env: {
                ...process.env,
                OLLAMA_HOST: `127.0.0.1:${nextPort}`,
            },
            onExit: (subprocess, exitCode, signalCode, error) => {
                console.log("Ollama server exited", newEndpoint, exitCode, signalCode, error);
                removeDbEndpoint(newEndpoint);
                ollamaServers.delete(newEndpoint);
            },
        });
        console.log("Ollama server started");

        const ollamaClient = new Ollama({ host: newEndpoint });

        const endpointDbId = createDbEndpoint(newEndpoint);
        if (!endpointDbId) {
            proc.kill();
            return;
        }

        ollamaServers.set(newEndpoint, { subprocess: proc, client: ollamaClient, endpoint: newEndpoint });
        return newEndpoint;
    }

    const remove = async (id: string) => {
        const server = ollamaServers.get(id);
        if (!server) {
            return false;
        }
        server.subprocess.kill();

        // console.log(`Ollama server that runs on ${id} exited with code ${await server.subprocess.exited}`);
        removeDbEndpoint(id);
        ollamaServers.delete(id);
        return true;
    }

    const list = () => Array.from(ollamaServers.values());

    const get = (id: string) => ollamaServers.get(id);

    const removeAll = async () => {
        const results = await Promise.all(
            Array.from(ollamaServers.keys()).map(async (id) => {
                const success = await remove(id);
                return { endpoint: id, success };
            })
        );
        return results;
    }

    return {
        add,
        remove,
        list,
        get,
        removeAll,
        abortCurrentlyRunningChat,
        addRunningOllamaServer,
        removeRunningOllamaServer,
        clearRunningOllamaServers,
    };
}

export const ollamaServerManager = createOllamaServerManager();