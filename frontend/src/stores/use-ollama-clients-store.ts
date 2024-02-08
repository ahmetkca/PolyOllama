import { create } from 'zustand';



type OllamaClientsStore = {
    endpoints: string[];
    endpointsSelectedModel: Map<string, string>;

    endpointsToChat: Map<string, boolean>;
    enableChatForEndpoint: (endpoint: string) => void;
    disableChatForEndpoint: (endpoint: string) => void;

    setSelectedModelByEndpoint: (endpoint: string, model: string) => void;
    setSelectedModelForAllEndpoints: (model: string) => void;

    setEndpoints: (endpoints: string[]) => void;
    addEndpoint: (endpoint: string) => void;
    removeEndpoint: (endpoint: string) => void;
    clearEndpoints: () => void;
}

export const useOllamaClientsStore = create<OllamaClientsStore>((set, get) => ({
    endpoints: [],
    setEndpoints: (endpoints) => {
        set({
            endpoints,
            endpointsToChat: new Map(endpoints.map((endpoint) => [endpoint, true])),
            endpointsSelectedModel: new Map(endpoints.map((endpoint) => [endpoint, ''])),
        });
    },
    addEndpoint: (endpoint) => {
        set((state) => ({
            endpoints: [...state.endpoints, endpoint],
            endpointsSelectedModel: new Map([...state.endpointsSelectedModel, [endpoint, '']]),
            endpointsToChat: new Map([...state.endpointsToChat, [endpoint, true]])
        }));
    },
    removeEndpoint: (endpoint) => {
        set((state) => ({
            endpoints: state.endpoints.filter((e) => e !== endpoint),
            endpointsSelectedModel: new Map([...state.endpointsSelectedModel].filter(([e]) => e !== endpoint)),
            endpointsToChat: new Map([...state.endpointsToChat].filter(([e]) => e !== endpoint)),
        }));
    },
    clearEndpoints: () => {
        set({
            endpoints: [],
            endpointsToChat: new Map(),
            endpointsSelectedModel: new Map(),
        });
    },

    endpointsSelectedModel: new Map(),
    setSelectedModelByEndpoint: (endpoint, model) => {
        const updatedMap = new Map(get().endpointsSelectedModel);
        updatedMap.set(endpoint, model);
        set({ endpointsSelectedModel: updatedMap });
    },
    setSelectedModelForAllEndpoints: (model) => {
        const updatedMap = new Map(get().endpointsSelectedModel);
        get().endpoints.forEach((endpoint) => {
            updatedMap.set(endpoint, model);
        });
        set({ endpointsSelectedModel: updatedMap });
    },

    endpointsToChat: new Map(),
    enableChatForEndpoint: (endpoint) => {
        const updatedMap = new Map(get().endpointsToChat);
        updatedMap.set(endpoint, true);
        set({ endpointsToChat: updatedMap });
    },
    disableChatForEndpoint: (endpoint) => {
        const updatedMap = new Map(get().endpointsToChat);
        updatedMap.set(endpoint, false);
        set({ endpointsToChat: updatedMap });
    },
}));