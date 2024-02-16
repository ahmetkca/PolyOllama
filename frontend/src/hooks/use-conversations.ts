import { fetcher } from "@/lib/utils";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

async function getEndpointByEndpoint(endpoint: string) {
    const response = await fetch(`http://localhost:3000/endpoints?endpoint=${endpoint}`);
    const data = await response.json();
    // {
    //   endpoint: {
    //     endpoint_id: number;
    //     endpoint: string;
    //   }
    // }
    // check if data has the right shape
    if (!data || !(data?.endpoint)
        || !(data?.endpoint?.endpoint_id)
        || !(data?.endpoint?.endpoint)
    ) {
        throw new Error("Failed to get endpoint");
    }
    return data.endpoint as { endpoint_id: number; endpoint: string };
}

async function createConversation(url: string, { arg }: { arg: { model: string; chatId: number; endpoint: string } }) {
    const { model, chatId, endpoint } = arg;
    const {
        endpoint_id: endpointId
    } = await getEndpointByEndpoint(endpoint);
    if (endpointId === undefined) {
        throw new Error(`Endpoint ${endpoint} does not exist`);
    }
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, chatId, endpointId }),
    });
    const data = await response.json();
    // { success: conversation_id !== undefined, conversation_id }
    const conversationId = data?.conversation_id as number | undefined;
    if (!data.success || conversationId === undefined) {
        throw new Error("Failed to create conversation");
    }
    return { conversation_id: conversationId };
}


export const useConversationCreate = () => {
    const { data, trigger, error, isMutating, reset } = useSWRMutation(
        "http://localhost:3000/conversations",
        createConversation,
        {
            revalidate: true,
        }
    );

    return {
        data,
        trigger,
        error,
        isMutating,
        reset,
    };
};


export const useConversation = ({
    chatId,
    conversationId,
    endpoint
}: Partial<{
    chatId: number; conversationId: number; endpoint: string
}>) => {
    const {
        data,
        error,
        isLoading,
        mutate
    } = useSWR<{
        conversation: {
            conversation_id: number;
            model: string;
            chat_id: number;
            endpoint_id: number;
            endpoint: string;
        };
    }, unknown>(
        chatId && conversationId && endpoint
            ?
            `http://localhost:3000/conversations/${conversationId}?chatId=${chatId}&endpoint=${endpoint}`
            :
            null,
        fetcher
    );

    return {
        data,
        isLoading,
        isError: error,
        mutate,
    };
};

export const useConversations = (chatId?: number) => {

    // {
    //     conversation_id: number;
    //     model: string;
    //     chat_id: number;
    //     endpoint_id: number | null;
    // } & {
    //     endpoint: string | null;
    // }

    const {
        data,
        error,
        isLoading,
        mutate
    } = useSWR<{
        conversations: {
            conversation_id: number;
            model: string;
            chat_id: number;
            endpoint_id: number | null;
            endpoint: string | null;
        }[];
    }>(
        chatId ? `http://localhost:3000/conversations?chatId=${chatId}` : null,
        fetcher
    );



    return {
        data,
        isLoading,
        isError: error,
        mutate,
    };
}

export const useConversationMessages = (conversationId?: number) => {
    const {
        data,
        error,
        isLoading,
        mutate
    } = useSWR<{
        messages: {
            message_id: string;
            conversation_id: number;
            role: "system" | "user" | "assistant";
            content: string;
            image: Uint8Array | null;
            created_at: string;
            total_duration: number | null;
            load_duration: number | null;
            prompt_eval_count: number | null;
            prompt_eval_duration: number | null;
            prompt_eval_rate: number | null;
            eval_count: number | null;
            eval_duration: number | null;
            eval_rate: number | null;
            endpoint_id: number;
            model: string;
            chat_id: number;
            endpoint: string;
        }[];
    }>(
        conversationId ? `http://localhost:3000/conversations/${conversationId}/messages` : null,
        fetcher
    );

    return {
        data,
        isLoading,
        isError: error,
        mutate,
    };
};