import { Database } from "bun:sqlite";

const DB_PATH = "db.sqlite";
// const db = new Database(":memory:");
const db = new Database(DB_PATH);
db.exec("PRAGMA foreign_keys = ON;"); // Enable foreign key constraints
db.exec("PRAGMA journal_mode = WAL;"); // Enable WAL mode
db.exec("PRAGMA synchronous = NORMAL;"); // Enable synchronous mode
db.exec("PRAGMA temp_store = MEMORY;"); // Enable temp store mode
db.exec("PRAGMA cache_size = 10000;"); // Enable cache size (10MB)
// enable mmap mode (256MB)
db.exec("PRAGMA mmap_size = 268435456;");
// enable threads for high concurrency
db.exec("PRAGMA threads = 4;");

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


// endpoint_id can be null
// endpoint_id must be unique across all conversations
// conversation_id must be unique across all conversations
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





// message_id must be unique across all conversations
// message_id must be uuid
db.exec(`
CREATE TABLE IF NOT EXISTS messages (
    message_id TEXT PRIMARY KEY NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(substr(hex(randomblob(2)),2)) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    conversation_id INTEGER NOT NULL,
    role TEXT CHECK(role IN ('system', 'user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    image BLOB,
    created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),

    total_duration INTEGER,
    load_duration INTEGER,
    prompt_eval_count INTEGER,
    prompt_eval_duration INTEGER,
    prompt_eval_rate REAL,
    eval_count INTEGER,
    eval_duration INTEGER,
    eval_rate REAL,

    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
);
`);




export { db };