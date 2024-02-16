import { db } from "./db";
import { SQLiteError } from "bun:sqlite";


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


interface MessageMetrics {
    total_duration: number | null;
    load_duration: number | null;
    prompt_eval_count: number | null;
    prompt_eval_duration: number | null;
    prompt_eval_rate: number | null;
    eval_count: number | null;
    eval_duration: number | null;
    eval_rate: number | null;
}

export const updateMessageMetricsByMessageId = (messageId: string, metrics: MessageMetrics): boolean => {

    const updateMetrics = db
        .prepare<unknown, { $message_id: string; $total_duration: number | null; $load_duration: number | null; $prompt_eval_count: number | null; $prompt_eval_duration: number | null; $prompt_eval_rate: number | null; $eval_count: number | null; $eval_duration: number | null; $eval_rate: number | null }>(`
        UPDATE 
            messages 
        SET 
            total_duration = $total_duration, 
            load_duration = $load_duration, 
            prompt_eval_count = $prompt_eval_count, 
            prompt_eval_duration = $prompt_eval_duration, 
            prompt_eval_rate = $prompt_eval_rate, 
            eval_count = $eval_count, 
            eval_duration = $eval_duration, 
            eval_rate = $eval_rate 
        WHERE 
            message_id = $message_id;
    `);

    try {
        updateMetrics.run({
            $message_id: messageId,
            $total_duration: metrics.total_duration,
            $load_duration: metrics.load_duration,
            $prompt_eval_count: metrics.prompt_eval_count,
            $prompt_eval_duration: metrics.prompt_eval_duration,
            $prompt_eval_rate: metrics.prompt_eval_rate,
            $eval_count: metrics.eval_count,
            $eval_duration: metrics.eval_duration,
            $eval_rate: metrics.eval_rate
        });
        updateMetrics.finalize();
        return true;
    } catch (e: unknown) {
        if (e instanceof SQLiteError) {
            console.error(e);
        }
        return false;
    }

}