import { Ollama } from "ollama";



import {
    $,
    spawn,
    type Subprocess,
} from "bun";

type TopKTopPValues = {
    topK: number;
    topP: number;
};

function generateTopKTopP(
    customValues?: Partial<TopKTopPValues>,
): TopKTopPValues {
    const defaultValues: TopKTopPValues = {
        topK: 35, // Midpoint of 20-50
        topP: 0.55, // Midpoint of 0.4-0.7
    };

    const finalValues: TopKTopPValues = { ...defaultValues, ...customValues };

    finalValues.topK = Math.max(1, Math.min(finalValues.topK, 100));
    finalValues.topP = Math.max(0.1, Math.min(finalValues.topP, 1.0));

    return finalValues;
}

let endpoints: string[] = [];

function getEndpoints() {
    return endpoints;
}

export type OllamaClient = {
    client: Ollama;
    endpoint: string;
};

let ollamaClientPids: Map<string, number> = new Map();
// let ollamaServer



async function killAllOllamaServers() {
    const statuses = [];
    for (const endpoint of endpoints) {
        console.log(`Killing ollama server at ${endpoint}`);
        const status = await killOllamaServer(endpoint);
        statuses.push({ endpoint, success: status });
    }
    return statuses;
}


function getOllamaClientPids() {
    return ollamaClientPids;
}

let endpointsMap = new Map<string, OllamaClient>();

function getEndpointsMap() {
    return endpointsMap;
}

let ollamaClients: { ollamaClients: OllamaClient[] } = { ollamaClients: [] };

function getOllamaClients() {
    return ollamaClients;
}

for (const endpoint of endpoints) {
    const ollamaClient = new Ollama({ host: endpoint });
    endpointsMap.set(endpoint, { client: ollamaClient, endpoint });
    ollamaClients = { ollamaClients: [...ollamaClients.ollamaClients, { client: ollamaClient, endpoint }] };
}


const killOllamaServer = async (endpoint: string) => {
    console.log(`There are ${endpoints.length} endpoints to kill`)
    const pid = getOllamaClientPids().get(endpoint);
    if (pid) {
        console.log("Killing ollama server", pid);
        const ret = await $`kill -9 ${pid}`;
        console.log(ret.stdout.toString());
        if (ret.exitCode !== 0) {
            // throw new Error("Failed to kill ollama server");
            console.log(`Failed to kill ollama server at ${endpoint} with pid ${pid}`);
            return false;
        }
        ollamaClientPids = new Map([...ollamaClientPids].filter(([key, value]) => key !== endpoint));

        endpoints = endpoints.filter((e) => e !== endpoint);
        endpointsMap = new Map([...endpointsMap].filter(([key, value]) => key !== endpoint));
        ollamaClients = { ollamaClients: ollamaClients.ollamaClients.filter((c) => c.endpoint !== endpoint) };

        console.log("Killed ollama server", pid);
        return true;
    }
    console.log("No ollama server found to kill");
    return false;
}


const addOllamaServer = async () => {
    const DEFAULT_START_PORT = 11434;
    // find the highest port number from the endpoints
    const port = Math.max(
        ...endpoints.map((endpoint) => parseInt(endpoint.split(":")[2])),
        DEFAULT_START_PORT,
    );
    // we will start with the next port number and keep trying until we find a free port
    // in Bun you can terminal commands using the $ function ex. const ret = await $`MY_VAR=${value} ls -l`
    // find the next available port
    const MAX_TRIES = 100;
    let nextPort = port + 1;
    while (true) {
        if (nextPort - port > MAX_TRIES) {
            throw new Error("No available port found");
        }
        const ret = await $`lsof -i :${nextPort}`;
        if (ret.exitCode === 1) {
            break;
        }
        nextPort++;
    }

    // run a new ollama server using the next available port
    // we also need its pid to kill it later

    // run a new ollama server using the next available port
    // we also need its pid to kill it later
    const proc = spawn(["ollama", "serve"], {
        env: {
            ...process.env,
            OLLAMA_HOST: `127.0.0.1:${nextPort}`,
        }
    });
    // proc.unref();

    // const ret = await $`OLLAMA_HOST=127.0.0.1:${nextPort} ollama serve & echo $!`;
    // if (ret.exitCode !== 0) {
    //     throw new Error("Failed to start ollama server");
    // }

    // add the new endpoint to the list of endpoints
    const newEndpoint = `http://127.0.0.1:${nextPort}`;
    endpoints = [...endpoints, newEndpoint];

    // add the new ollama client to the list of ollama clients
    const ollamaClient = new Ollama({ host: newEndpoint });
    endpointsMap = new Map([...endpointsMap, [newEndpoint, { client: ollamaClient, endpoint: newEndpoint }]]);

    ollamaClients = { ollamaClients: [...ollamaClients.ollamaClients, { client: ollamaClient, endpoint: newEndpoint }] };

    // add the new ollama server's pid to the list of pids
    // ret.stdout is Buffer
    const pid = proc.pid;
    ollamaClientPids = new Map([...ollamaClientPids, [newEndpoint, pid]]);
    console.log("Started ollama server", pid, newEndpoint);

    return newEndpoint;

}



// export { getEndpoints, getEndpointsMap, getOllamaClients, generateTopKTopP, addOllamaServer, killOllamaServer, killAllOllamaServers };