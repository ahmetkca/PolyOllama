import { useEffect, useState } from "react";
import { useWebSocket } from "./WebSocketContext";
import TypeWriter from "./TypeWriter";


export const ChatTitle = ({
    location,
    chatId,
    chatTitle,
}: {
    location: string;
    chatId: number;
    chatTitle: string;
}) => {

    const [trigger, setTrigger] = useState<{ count: number; title: string }>({ count: 0, title: chatTitle });

    const { registerChatTitleCreatedHandler, unregisterChatTitleCreatedHandler } = useWebSocket();

    const handleChatTitleCreated = (message: any) => {
        console.log('abc message', message, chatId, location);
        const { chatId: chatIdFromWS, title: newTitle } = message.data as { chatId: number, title: string };
        console.log(`abc chatIdFromWS: ${chatIdFromWS}, chatId: ${chatId}`);
        if (chatIdFromWS === chatId) {
            console.log('abc chatIdFromWS === chatId');
            setTrigger((prev) => ({ count: prev.count + 1, title: newTitle }));
        } else {
            console.log('abc chatIdFromWS !== chatId');
        }
    }

    useEffect(() => {
        registerChatTitleCreatedHandler(`${location}-${chatId}`, handleChatTitleCreated);

        return () => {
            unregisterChatTitleCreatedHandler(`${location}-${chatId}`);
        };
    }, [chatId, chatTitle, location, registerChatTitleCreatedHandler, unregisterChatTitleCreatedHandler]);

    return (
        <>
            <TypeWriter
                text={trigger.title}
                mode={'manual'}
                speed={150}
                triggerEffect={trigger.count}
            />
        </>
    )
}