import { db } from "./db";
import { SQLiteError } from "bun:sqlite";

// CREATE TABLE IF NOT EXISTS chats (
//     chat_id INTEGER PRIMARY KEY AUTOINCREMENT, 
//     title TEXT NOT NULL
// );


export const createChat = (title: string): number | undefined => {
    try {
        const insertChat = db.prepare<{
            chat_id: number;
            title: string;
        }, { $title: string }>(
            "INSERT INTO chats (title) VALUES ($title);"
        );
        insertChat.run({ $title: title });
        insertChat.finalize();
        const lastInsertedRow = db.prepare<{ chat_id: number }, null>(
            "SELECT last_insert_rowid() as chat_id;"
        );

        const chatId = lastInsertedRow.get(null);
        lastInsertedRow.finalize();
        return chatId?.chat_id;
    } catch (e: unknown) {
        if (e instanceof SQLiteError) {
            console.error(e);
        }
        return undefined;
    }
}

export const updateChatTitle = (chatId: number, title: string): boolean => {
    try {
        const updateChat = db.prepare<unknown, { $chat_id: number; $title: string }>(
            "UPDATE chats SET title = $title WHERE chat_id = $chat_id;"
        );
        updateChat.run({ $chat_id: chatId, $title: title });
        updateChat.finalize();
        return true;
    } catch (e: unknown) {
        if (e instanceof SQLiteError) {
            console.error(e);
        }
        return false;
    }
}


export const getChatByChatId = (chatId: number) => {
    const selectChatStmt = db.prepare<{
        chat_id: number
        title: string
    }, { $chat_id: number }>("SELECT * FROM chats WHERE chat_id = $chat_id;");
    const row = selectChatStmt.get({ $chat_id: chatId });
    selectChatStmt.finalize();
    return row;
}


export const getAllChats = () => {
    const selectChats = db.prepare<{
        chat_id: number
        title: string
    }, null>("SELECT * FROM chats;");

    const rows = selectChats.all(null);
    selectChats.finalize();
    return rows;
}

export const deleteChat = (chatId: number): boolean => {
    try {
        const deleteChat = db.prepare<unknown, { $chat_id: number }>(
            "DELETE FROM chats WHERE chat_id = $chat_id;"
        );
        deleteChat.run({ $chat_id: chatId });
        deleteChat.finalize();
        return true;
    } catch (e: unknown) {
        if (e instanceof SQLiteError) {
            console.error(e);
        }
        return false;
    }
}
