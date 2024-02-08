import { Database } from "bun:sqlite";

const DB_PATH = "db.sqlite";
const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
CREATE TABLE IF NOT EXISTS endpoints (
    endpoint_id INTEGER PRIMARY KEY AUTOINCREMENT, 
    endpoint TEXT NOT NULL UNIQUE
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS chats (
    chat_id INTEGER PRIMARY KEY AUTOINCREMENT, 
    title TEXT NOT NULL
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS conversations (
    conversation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    model TEXT NOT NULL,
    chat_id INTEGER NOT NULL,
    endpoint_id INTEGER,
    UNIQUE(chat_id, endpoint_id),
    FOREIGN KEY (chat_id) REFERENCES chats(chat_id) ON DELETE CASCADE,
    FOREIGN KEY (endpoint_id) REFERENCES endpoints(endpoint_id) ON DELETE SET NULL
);
`)

db.exec(`
CREATE TABLE IF NOT EXISTS messages (
    message_id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT CHECK(role IN ('system', 'user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    image TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
);
`);




export { db };