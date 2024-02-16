import { db } from "./db";
import { SQLiteError } from "bun:sqlite";


// CREATE TABLE IF NOT EXISTS conversations (
//     conversation_id INTEGER PRIMARY KEY AUTOINCREMENT,
//     model TEXT NOT NULL,
//     chat_id INTEGER NOT NULL,
//     endpoint_id INTEGER,
//     UNIQUE(chat_id, endpoint_id),
//     FOREIGN KEY (chat_id) REFERENCES chats(chat_id) ON DELETE CASCADE,
//     FOREIGN KEY (endpoint_id) REFERENCES endpoints(endpoint_id) ON DELETE SET NULL
// );


// CREATE TABLE IF NOT EXISTS messages (
//     message_id TEXT PRIMARY KEY NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(substr(hex(randomblob(2)),2)) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
//     conversation_id INTEGER NOT NULL,
//     role TEXT CHECK(role IN ('system', 'user', 'assistant')) NOT NULL,
//     content TEXT NOT NULL,
//     image BLOB,
//     created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),

//     total_duration INTEGER,
//     load_duration INTEGER,
//     prompt_eval_count INTEGER,
//     prompt_eval_duration INTEGER,
//     prompt_eval_rate REAL,
//     eval_count INTEGER,
//     eval_duration INTEGER,
//     eval_rate REAL,

//     FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
// );

type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
    // image column is BLOB type
    image: Uint8Array | null;
}


export const createConversation = (
    model: string,
    chatId: number,
    endpointId: number,
) => {
    try {
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
        return conversationId?.conversation_id;
    } catch (e: unknown) {
        if (e instanceof SQLiteError) {
            console.error(e);
        }
        return undefined;
    }
}


export const createConversationWithMessages = (
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
            const insertMessageStmt = db.prepare<unknown, { $conversation_id: number; $role: string; $content: string; $image: Uint8Array | null }>(
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
): string | undefined => {
    try {
        const insertMessageStmt = db.prepare<{
            message_id: string;
        }, { $conversation_id: number; $role: string; $content: string; $image: Uint8Array | null }>(
            "INSERT INTO messages (conversation_id, role, content, image) VALUES ($conversation_id, $role, $content, $image) RETURNING message_id;"
        );
        const row = insertMessageStmt.get({ $conversation_id: conversationId, $role: message.role, $content: message.content, $image: message.image });
        insertMessageStmt.finalize();
        return row?.message_id;
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
        // endpoint_id can be null
        endpoint_id: number | null;
    }, { $chat_id: number }>("SELECT * FROM conversations WHERE chat_id = $chat_id;");
    const rows = selectConversations.all({ $chat_id: chatId });
    selectConversations.finalize();
    return rows;
}

export const getMessagesByConversationId = (conversationId: number) => {
    // order by created_at, the most recent message will be last
    // created_at column is `created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))`

    // const selectMessages = db.prepare<{
    //     message_id: number;
    //     conversation_id: number;
    //     role: "system" | "user" | "assistant";
    //     content: string;
    //     image: Uint8Array | null;
    //     created_at: string;
    // }, { $conversation_id: number }>("SELECT * FROM messages WHERE conversation_id = $conversation_id ORDER BY created_at;");
    // const rows = selectMessages.all({ $conversation_id: conversationId });
    // selectMessages.finalize();
    // return rows;

    const selectMessages = db.prepare<{
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
    }, { $conversation_id: number }>(`
    SELECT
        m.message_id,
        m.conversation_id,
        m.role,
        m.content,
        m.image,
        m.created_at,
        m.total_duration,
        m.load_duration,
        m.prompt_eval_count,
        m.prompt_eval_duration,
        m.prompt_eval_rate,
        m.eval_count,
        m.eval_duration,
        m.eval_rate,
        c.endpoint_id,
        c.model,
        c.chat_id,
        e.endpoint -- Fetches the endpoint text
    FROM 
        messages m
    JOIN 
        conversations c ON m.conversation_id = c.conversation_id
    INNER JOIN 
        endpoints e ON c.endpoint_id = e.endpoint_id
    WHERE 
        m.conversation_id = $conversation_id
    `);
    const rows = selectMessages.all({ $conversation_id: conversationId });
    selectMessages.finalize();

    return rows;
}


export const getEndpointByConversationId = (conversationId: number) => {
    // CREATE TABLE IF NOT EXISTS endpoints (
    //     endpoint_id INTEGER PRIMARY KEY AUTOINCREMENT, 
    //     endpoint TEXT NOT NULL UNIQUE
    // );

    const selectEndpoint = db.prepare<{
        endpoint_id: number;
        endpoint: string;
    }, { $conversation_id: number }>(
        "SELECT e.endpoint_id, e.endpoint FROM endpoints e JOIN conversations c ON e.endpoint_id = c.endpoint_id WHERE c.conversation_id = $conversation_id;"
    );
    const row = selectEndpoint.get({ $conversation_id: conversationId });
    selectEndpoint.finalize();
    return row;
}

export const getConversationByChatIdAndEndpoint = (chatId: number, endpoint: string) => {
    const selectConversation = db.prepare<{
        conversation_id: number;
        model: string;
        chat_id: number;
        endpoint_id: number;
    }, { $chat_id: number; $endpoint: string }>(`
        SELECT 
            c.conversation_id
        FROM 
            conversations AS c
        JOIN 
            endpoints AS e ON c.endpoint_id = e.endpoint_id
        JOIN 
            chats AS ch ON c.chat_id = ch.chat_id
        WHERE 
            e.endpoint = $endpoint AND ch.chat_id = $chat_id;  
    `);
    const row = selectConversation.get({ $chat_id: chatId, $endpoint: endpoint });
    selectConversation.finalize();
    return row;
}

export const getConversationByConversationIdChatIdAndEndpoint = (conversationId: number, chatId: number, endpoint: string) => {
    const selectConversation = db.prepare<{
        conversation_id: number;
        model: string;
        chat_id: number;
        endpoint_id: number;
        endpoint: string;
    }, { $conversation_id: number; $chat_id: number; $endpoint: string }>(`
        SELECT 
            c.conversation_id,
            c.model,
            c.chat_id,
            c.endpoint_id,
            e.endpoint
        FROM 
            conversations AS c
        JOIN 
            endpoints AS e ON c.endpoint_id = e.endpoint_id
        JOIN 
            chats AS ch ON c.chat_id = ch.chat_id
        WHERE 
            c.conversation_id = $conversation_id AND e.endpoint = $endpoint AND ch.chat_id = $chat_id;  
    `);
    const row = selectConversation.get({ $conversation_id: conversationId, $chat_id: chatId, $endpoint: endpoint });
    selectConversation.finalize();
    return row;
}


export const getMessageByConversationIdAndMessageId = (conversationId: number, messageId: string) => {
    const selectMessage = db.prepare<{
        message_id: string;
        conversation_id: number;
        role: "system" | "user" | "assistant";
        content: string;
        image: Uint8Array | null;
        created_at: string;
    }, { $conversation_id: number; $message_id: string }>("SELECT * FROM messages WHERE conversation_id = $conversation_id AND message_id = $message_id;");
    const row = selectMessage.get({ $conversation_id: conversationId, $message_id: messageId });
    selectMessage.finalize();
    return row;
}



export const assignEndpointToConversation = (conversationId: number, endpointId: number) => {
    try {
        const updateConversation = db.prepare<unknown, { $conversation_id: number; $endpoint_id: number }>(
            "UPDATE conversations SET endpoint_id = $endpoint_id WHERE conversation_id = $conversation_id;"
        );
        updateConversation.run({ $conversation_id: conversationId, $endpoint_id: endpointId });
        updateConversation.finalize();
        return true;
    } catch (e: unknown) {
        if (e instanceof SQLiteError) {
            console.error(e);
        }
        return false;
    }
}