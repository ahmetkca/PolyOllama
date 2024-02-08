import { create } from 'zustand';
import { hashEndpoints } from '../lib/utils';

export type MessageWhenDone = {
    created_at: string;
    done: true
    eval_count: number;
    eval_duration: number;
    load_duration: number;
    message: {
        content: string;
        role: "assistant" | "user";

    }
    model: string;
    prompt_eval_count: number;
    prompt_eval_duration: number;
    total_duration: number;
}

export type MessageWhenNotDone = {
    created_at: string;
    done: boolean;
    message: {
        content: string;
        role: "assistant" | "user";
    },
    model: string;
}

export type OllamaStreamMessage = {
    type: string;
    endpoint: string;
    data: {
        message: MessageWhenDone | MessageWhenNotDone;
        messageChunkId: string;
    }
}

export type ChatEntry = {
    id: string;
    message: {
        content: string;
        role: "assistant" | "user";
        images?: File[];
    },
    model: string;

    endpoint: string;
}


type ChatEntriesStore = {
    chatEntriesIndexByEndpoint: Map<string, number>;
    getChatEntriesIndexByEndpoint: (endpoint: string) => number;// | undefined;
    createChatEntriesByEndpoint: (endpoint: string) => void;
    removeChatEntriesByEndpoint: (endpoint: string) => void;
    allChatEntries: ChatEntry[][];
    setChatEntries: (endpoint: string, chatEntries: ChatEntry[]) => void;
    addChatEntry: (endpoint: string, chatEntry: ChatEntry) => void;
    removeChatEntry: (endpoint: string, chatEntry: ChatEntry) => void;
    clearChatEntries: (endpoint: string) => void;
    addContentToChatEntryById: (endpoint: string, id: string, content: string) => void;
    doesChatEntryExist: (endpoint: string, id: string) => boolean;
}


export const useChatEntriesStore = create<ChatEntriesStore>((set, get) => ({
    chatEntriesIndexByEndpoint: new Map(),
    getChatEntriesIndexByEndpoint: (endpoint) => {
        // const index = get().chatEntriesIndexByEndpoint.get(endpoint);
        // if (index) {
        //     return index;
        // }
        // return undefined;

        const hashedEndpointIndex = hashEndpoints(endpoint);
        return hashedEndpointIndex;
    },
    createChatEntriesByEndpoint: (endpoint) => {

        const hashedEndpointIndex = hashEndpoints(endpoint);
        set((state) => {
            const updatedAllChatEntries = [...state.allChatEntries];
            console.log("createChatEntriesByEndpoint", hashedEndpointIndex, updatedAllChatEntries)
            updatedAllChatEntries[hashedEndpointIndex] = [];
            const updatedChatEntriesIndexByEndpoint = new Map(state.chatEntriesIndexByEndpoint);
            updatedChatEntriesIndexByEndpoint.set(endpoint, hashedEndpointIndex);
            return { allChatEntries: updatedAllChatEntries, chatEntriesIndexByEndpoint: updatedChatEntriesIndexByEndpoint };
        });
    },
    removeChatEntriesByEndpoint: (endpoint) => {
        const index = get().getChatEntriesIndexByEndpoint(endpoint);
        if (index) {
            set((state) => {
                const updatedAllChatEntries = [...state.allChatEntries];
                updatedAllChatEntries[index] = [];
                const updatedChatEntriesIndexByEndpoint = new Map(state.chatEntriesIndexByEndpoint);
                updatedChatEntriesIndexByEndpoint.delete(endpoint);
                return { allChatEntries: updatedAllChatEntries, chatEntriesIndexByEndpoint: updatedChatEntriesIndexByEndpoint };
            });
        }
    },

    allChatEntries: [],
    setChatEntries: (endpoint, chatEntries) => {
        const index = get().getChatEntriesIndexByEndpoint(endpoint);
        // if (index) {
        set((state) => {
            const newAllChatEntries = [...state.allChatEntries];
            newAllChatEntries[index] = chatEntries;
            return { allChatEntries: newAllChatEntries, chatEntriesIndexByEndpoint: state.chatEntriesIndexByEndpoint };
        });
        // }
    },
    addChatEntry: (endpoint, chatEntry) => {

        const index = get().getChatEntriesIndexByEndpoint(endpoint);
        console.log("addChatEntry", index, endpoint, chatEntry);
        // if (index) {
        set((state) => {
            const newAllChatEntries = [...state.allChatEntries];
            console.log("before", newAllChatEntries);
            newAllChatEntries[index].push(chatEntry);
            console.log("after", newAllChatEntries);
            return { allChatEntries: newAllChatEntries };
        });


        // }
    },
    removeChatEntry: (endpoint, chatEntry) => {
        const index = get().getChatEntriesIndexByEndpoint(endpoint);
        // if (index) {
        set((state) => {
            let newAllChatEntries = [...state.allChatEntries];
            newAllChatEntries[index] = newAllChatEntries[index].filter((ce) => ce.id !== chatEntry.id);
            return { allChatEntries: newAllChatEntries, chatEntriesIndexByEndpoint: state.chatEntriesIndexByEndpoint };
        });
        // }
    },

    clearChatEntries: (endpoint) => {
        const index = get().getChatEntriesIndexByEndpoint(endpoint);
        // if (index) {
        set((state) => {
            let newAllChatEntries = [...state.allChatEntries];
            newAllChatEntries[index] = [];

            return { allChatEntries: newAllChatEntries, chatEntriesIndexByEndpoint: state.chatEntriesIndexByEndpoint };
        });
        // }
    },
    addContentToChatEntryById: (endpoint, id, content) => {
        const index = get().getChatEntriesIndexByEndpoint(endpoint);
        // if (index) {
        set((state) => {
            let newAllChatEntries = [...state.allChatEntries];
            const chatEntry = newAllChatEntries[index].find((chatEntry) => chatEntry.id === id);
            if (chatEntry) {
                chatEntry.message.content = chatEntry.message.content + content;
            }
            return { allChatEntries: newAllChatEntries, chatEntriesIndexByEndpoint: state.chatEntriesIndexByEndpoint };
        });
        // }
    },
    doesChatEntryExist: (endpoint, id) => {
        const index = get().getChatEntriesIndexByEndpoint(endpoint);
        // if (index) {
        const chatEntry = get().allChatEntries[index].find((chatEntry) => chatEntry.id === id);
        if (chatEntry) {
            return true;
        }
        // }
        return false;
    },
}));