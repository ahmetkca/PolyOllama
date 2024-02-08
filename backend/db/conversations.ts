import { db } from "./db";
import { SQLiteError } from "bun:sqlite";


// CREATE TABLE IF NOT EXISTS conversations (
//     conversation_id INTEGER PRIMARY KEY AUTOINCREMENT,
//     model TEXT NOT NULL,
//     chat_id INTEGER NOT NULL,
//     endpoint_id INTEGER NOT NULL,
//     UNIQUE(chat_id, endpoint_id),
//     FOREIGN KEY (chat_id) REFERENCES chats(chat_id),
//     FOREIGN KEY (endpoint_id) REFERENCES endpoints(endpoint_id)
// );


// CREATE TABLE IF NOT EXISTS messages (
//     message_id INTEGER PRIMARY KEY AUTOINCREMENT,
//     conversation_id INTEGER NOT NULL,
//     role TEXT CHECK(role IN ('system', 'user', 'assistant')) NOT NULL,
//     content TEXT NOT NULL,
//     image TEXT,
//     created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
//     FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
// );


type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
    image: string | null;
}


export const createConversation = (
    model: string,
    chatId: number,
    endpointId: number,
    messages: ChatMessage[],
): number | undefined => {
    try {
        const transaction = db.transaction((
            model: string,
            chatId: number,
            endpointId: number,
            messages: ChatMessage[],
        ) => {
            // first insert conversation
            const insertConversationStmt = db.prepare<unknown, { $model: string; $chat_id: number; $endpoint_id: number }>(
                "INSERT INTO conversations (model, chat_id, endpoint_id) VALUES ($model, $chat_id, $endpoint_id);"
            );
            insertConversationStmt.run({ $model: model, $chat_id: chatId, $endpoint_id: endpointId });
            insertConversationStmt.finalize();

            const lastInsertedStmt = db.prepare<{ conversation_id: number }, null>(
                "SELECT last_insert_rowid() as conversation_id;"
            );
            const conversationId = lastInsertedStmt.get(null);
            lastInsertedStmt.finalize();

            if (!conversationId) {
                throw new Error("Could not get newly inserted conversation id");
            }

            // then insert messages
            const insertMessageStmt = db.prepare<unknown, { $conversation_id: number; $role: string; $content: string; $image: string | null }>(
                "INSERT INTO messages (conversation_id, role, content, image) VALUES ($conversation_id, $role, $content, $image);"
            );
            // messages array might contain message with role "system".
            // we must ensure that if there is a message with role "system" it is the first message in the array
            // check if there is a message with role "system" and if so, check if it is the first message in the array.
            const systemMessageIndex = messages.findIndex((message) => message.role === "system");
            if (systemMessageIndex !== -1 && systemMessageIndex !== 0) {
                throw new Error("If there is a message with role 'system' it must be the first message in the array");
            }
            // after first message with role "system", check if the rest of the messages role's alternate between "user" and "assistant"
            // 'user' -> 'assistant' -> 'user' -> 'assistant' -> ...
            const alternatingRoles = messages.slice(systemMessageIndex + 1).map((message, i) => {
                if (i % 2 === 0) {
                    return message.role === "user";
                } else {
                    return message.role === "assistant";
                }
            }).every((isCorrectRole) => isCorrectRole);
            if (!alternatingRoles) {
                throw new Error("Messages with role 'user' and 'assistant' must alternate");
            }

            messages.forEach((message) => {
                insertMessageStmt.run({ $conversation_id: conversationId.conversation_id, $role: message.role, $content: message.content, $image: message.image });
            });
            insertMessageStmt.finalize();
        }
        );
        transaction(model, chatId, endpointId, messages);
    } catch (e: unknown) {
        if (e instanceof SQLiteError) {
            console.error(e);
        }
        return undefined;
    }
}


export const addMessageToConversation = (
    conversationId: number,
    message: ChatMessage,
): number | undefined => {
    try {
        const insertMessageStmt = db.prepare<unknown, { $conversation_id: number; $role: string; $content: string; $image: string | null }>(
            "INSERT INTO messages (conversation_id, role, content, image) VALUES ($conversation_id, $role, $content, $image);"
        );
        insertMessageStmt.run({ $conversation_id: conversationId, $role: message.role, $content: message.content, $image: message.image });
        insertMessageStmt.finalize();
    } catch (e: unknown) {
        if (e instanceof SQLiteError) {
            console.error(e);
        }
        return undefined;
    }
}

export const getConversationsByChatId = (chatId: number) => {
    const selectConversations = db.prepare<{
        conversation_id: number;
        model: string;
        chat_id: number;
        endpoint_id: number;
    }, { $chat_id: number }>("SELECT * FROM conversations WHERE chat_id = $chat_id;");
    const rows = selectConversations.all({ $chat_id: chatId });
    selectConversations.finalize();
    return rows;
}

export const getMessagesByConversationId = (conversationId: number) => {
    // order by created_at, the most recent message will be last
    // created_at column is `created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))`

    const selectMessages = db.prepare<{
        message_id: number;
        conversation_id: number;
        role: "system" | "user" | "assistant";
        content: string;
        image: string;
        created_at: string;
    }, { $conversation_id: number }>("SELECT * FROM messages WHERE conversation_id = $conversation_id ORDER BY created_at;");
    const rows = selectMessages.all({ $conversation_id: conversationId });
    selectMessages.finalize();
    return rows;
}