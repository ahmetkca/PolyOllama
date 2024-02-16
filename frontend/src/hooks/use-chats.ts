import { fetcher } from "@/lib/utils";
import useSWR, { Fetcher } from "swr";
import useSWRMutation from 'swr/mutation';




async function createChat(url: string, { arg }: { arg: { title: string } }) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: arg.title }),
    });

    if (!response.ok) {
        throw new Error('Failed to create chat');
    }

    const data = await response.json();
    if (!data || typeof data.chat_id !== 'number' || isNaN(data.chat_id)) {
        throw new Error('Failed to create chat');
    }
    return data as { chat_id: number };
}


export const useChatCreate = () => {
    const { data, trigger, error, isMutating, reset } = useSWRMutation('http://localhost:3000/chats', createChat, {
        revalidate: true,
    });

    return {
        data,
        trigger,
        error,
        isMutating,
        reset
    }
}



export const useChats = () => {
    const { data, error, isLoading, mutate } = useSWR<{
        chats: {
            conversations: {
                endpoint: string | null;
                conversation_id: number;
                model: string;
                chat_id: number;
                endpoint_id: number | null;
            }[];
            chat_id: number;
            title: string;
        }[];
    }, { error: string; }>('http://localhost:3000/chats', fetcher);

    return {
        data,
        isLoading,
        isError: error,
        mutate,
    }
}

export const useChat = (chatId?: number) => {
    const {
        data,
        error,
        isLoading,
        mutate
    } = useSWR<{
        chat: {
            conversations: {
                endpoint: string | null;
                conversation_id: number;
                model: string;
                chat_id: number;
                endpoint_id: number | null;
            }[];
            chat_id: number;
            title: string;
        };
    }, { error: string; }>(
        chatId ? `http://localhost:3000/chats/${chatId}` : null,
        fetcher
    );

    console.log('useChat', data, error, isLoading, mutate);

    return {
        data,
        isLoading,
        isError: error,
        mutate
    }
}


const deleteChat = async (url: string, { arg }: { arg: { chatId: number; } }) => {
    const response = await fetch(`${url}/${arg.chatId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('Failed to delete chat');
    }

    const data = await response.json();
    if (!data || typeof data.success !== 'boolean') {
        throw new Error('Failed to delete chat');
    }
    return data as { success: boolean };
}

export const useChatDelete = () => {

    const { data, trigger, error, isMutating, reset } = useSWRMutation('http://localhost:3000/chats', deleteChat, {
        revalidate: true,
    });

    return {
        data,
        trigger,
        error,
        isMutating,
        reset
    }

}

const assignEndpointsToConversations = async (url: string, { arg }: { arg: { chatId: number; endpoints: string[] } }) => {
    const response = await fetch(`${url}/${arg.chatId}/assign-endpoints-to-conversations`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoints: arg.endpoints }),
    });

    if (!response.ok) {
        throw new Error('Failed to assign endpoints to conversations');
    }

    const data = await response.json();
    return data;
}

export const useChatAssignEndpointsToConversations = () => {
    const {
        data,
        trigger,
        error,
        isMutating,
        reset
    } = useSWRMutation<{
        conversationsWithAssignedEndpoints: {
            conversation_id: number;
            endpoint_id: number;
        }[]
    }, { error: string; }, any, { chatId: number; endpoints: string[] }>
            ('http://localhost:3000/chats', assignEndpointsToConversations, {
                revalidate: true,
            });

    return {
        data,
        trigger,
        error,
        isMutating,
        reset
    }
}
