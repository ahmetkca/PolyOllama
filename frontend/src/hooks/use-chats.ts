import { fetcher } from "@/lib/utils";
import useSWR, { Fetcher } from "swr";
import useSWRMutation from 'swr/mutation';




async function createChat(url: string, { arg }: { arg: { title: string } }) {
    return fetch(url, {
        method: 'POST',
        body: JSON.stringify({ title: arg.title }),
    }).then(res => res.json())
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
    const { data, error, isLoading, mutate } = useSWR('http://localhost:3000/chats', fetcher);

    return {
        data,
        isLoading,
        isError: error,
        mutate,
    }
}



