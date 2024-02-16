import {
    getAllDbEndpoints,
    createDbEndpoint,
    getDbEndpoint,
    removeDbEndpoint,
    getEndpointsByChatId,
    getAllNonAssignedEndpointsByChatId,
    removeAllDbEndpoints,
} from "./endpoints";
import {
    createChat,
    updateChatTitle,
    getAllChats,
    deleteChat,
    getChatByChatId,

} from "./chats";
import {
    addMessageToConversation,
    createConversationWithMessages,
    getConversationsByChatId,
    getMessagesByConversationId,
    createConversation,
    getEndpointByConversationId,
    getConversationByChatIdAndEndpoint,
    getMessageByConversationIdAndMessageId,
    getConversationByConversationIdChatIdAndEndpoint,
    assignEndpointToConversation
} from "./conversations";

import {
updateMessageMetricsByMessageId
} from './messages';


function asyncWrapper<T extends Array<any>, U>(
    func: (...args: T) => U
): (...args: T) => Promise<U> {
    return (...args: T): Promise<U> => {
        return new Promise((resolve, reject) => {
            try {
                const result = func(...args);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    };
}


export {
    createDbEndpoint,
    getDbEndpoint,
    getAllDbEndpoints,
    removeDbEndpoint,
    createChat,
    updateChatTitle,
    getAllChats,
    addMessageToConversation,
    createConversationWithMessages,
    getConversationsByChatId,
    getMessagesByConversationId,
    createConversation,
    getEndpointByConversationId,
    getConversationByChatIdAndEndpoint,
    getMessageByConversationIdAndMessageId,
    getConversationByConversationIdChatIdAndEndpoint,
    deleteChat,
    getChatByChatId,
    getEndpointsByChatId,
    assignEndpointToConversation,
    getAllNonAssignedEndpointsByChatId,
    removeAllDbEndpoints,
    updateMessageMetricsByMessageId

};