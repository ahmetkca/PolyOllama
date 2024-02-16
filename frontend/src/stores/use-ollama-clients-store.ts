import { create } from 'zustand';



type OllamaClientsStore = {
    availableEndpoints: string[];
    addAvailableEndpoints: (endpoints: string[]) => void;

    endpoints: string[];
    endpointsSelectedModel: Map<string, string>;

    endpointsToChat: Map<string, boolean>;
    enableChatForEndpoint: (endpoint: string) => void;
    disableChatForEndpoint: (endpoint: string) => void;

    setSelectedModelByEndpoint: (endpoint: string, model: string) => void;
    setSelectedModelForAllEndpoints: (model: string) => void;

    setEndpoints: (endpoints: string[]) => void;
    addEndpoint: (endpoint: string) => void;
    addEndpoints: (endpoints: string[]) => void;
    removeEndpoint: (endpoint: string) => void;
    clearEndpoints: () => void;
}


export const useOllamaClientsStore = create<OllamaClientsStore>((set, get) => ({
    availableEndpoints: [],
    addAvailableEndpoints: (endpoints) => {
        set((state) => {
            return {
                ...state,
                availableEndpoints: [...state.availableEndpoints, ...endpoints]
            }
        });
    },

    endpoints: [],
    setEndpoints: (endpoints) => {
        console.log('avc setEndpoints');
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
    addEndpoints: (endpoints) => {
        set((state) => {
            const newEndpoints = endpoints.filter((endpoint) => !state.endpoints.includes(endpoint)); // filter out duplicates
            const newEndpointsSelectedModel = new Map(newEndpoints.map((endpoint) => [endpoint, '']));
            const newEndpointsToChat = new Map(newEndpoints.map((endpoint) => [endpoint, true]));
            return {
                endpoints: [...state.endpoints, ...newEndpoints],
                endpointsSelectedModel: new Map([...state.endpointsSelectedModel, ...newEndpointsSelectedModel]),
                endpointsToChat: new Map([...state.endpointsToChat, ...newEndpointsToChat])
            }
        })
    },

    removeEndpoint: (endpoint) => {
        set((state) => ({
            endpoints: state.endpoints.filter((e) => e !== endpoint),
            endpointsSelectedModel: new Map([...state.endpointsSelectedModel].filter(([e]) => e !== endpoint)),
            endpointsToChat: new Map([...state.endpointsToChat].filter(([e]) => e !== endpoint)),
        }));
    },
    clearEndpoints: () => {
        console.log('avc clearEndpoints')
        set({
            endpoints: [],
            endpointsToChat: new Map(),
            endpointsSelectedModel: new Map(),
        });
    },

    endpointsSelectedModel: new Map(),
    setSelectedModelByEndpoint: (endpoint, model) => {

        set(
            (state) => {
                console.log('avc setSelectedModelByEndpoint 1', endpoint, model);
                console.log('avc setSelectedModelByEndpoint 2', state.endpointsSelectedModel);
                const updatedMap = new Map(state.endpointsSelectedModel);

                return {
                    endpointsSelectedModel: updatedMap.set(endpoint, model)
                }
            });
        console.log(`avc setSelectedModelByEndpoint 3 ${endpoint}, ${model}`, get().endpointsSelectedModel);
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