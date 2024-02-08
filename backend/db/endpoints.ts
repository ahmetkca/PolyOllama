
import { SQLiteError } from "bun:sqlite";
import { db } from "./db";

// CREATE TABLE IF NOT EXISTS endpoints (
//     endpoint_id INTEGER PRIMARY KEY AUTOINCREMENT, 
//     endpoint TEXT NOT NULL UNIQUE
// );

export const createDbEndpoint = (endpoint: string): number | undefined => {
    // create uuid for endpoint
    try {
        const insertEndpoint = db.prepare<unknown, { $endpoint: string }>(
            "INSERT INTO endpoints (endpoint) VALUES ($endpoint);"
        );
        insertEndpoint.run({ $endpoint: endpoint });
        insertEndpoint.finalize();
        const lastInsertedRow = db.prepare<{ endpoint_id: number }, null>(
            "SELECT last_insert_rowid() as endpoint_id;"
        );

        const endpointId = lastInsertedRow.get(null);
        lastInsertedRow.finalize();
        return endpointId?.endpoint_id;
    } catch (e: unknown) {
        if (e instanceof SQLiteError) {
            console.error(e);
        }
        return undefined;
    }
}

export const getDbEndpoint = (endpoint: string) => {
    try {
        const selectEndpoint = db.prepare<{
            endpoint_id: number;
            endpoint: string
        }, {
            $endpoint: string
        }>("SELECT * FROM endpoints WHERE endpoint = $endpoint;");

        const rows = selectEndpoint.all({ $endpoint: endpoint });
        selectEndpoint.finalize();
        if (rows.length === 0) {
            return undefined;
        }

        return rows[0];
    } catch (e: unknown) {
        if (e instanceof SQLiteError) {
            console.error(e);
        }
        return undefined;
    }
}

export const getAllDbEndpoints = () => {
    const selectEndpoints = db.prepare<{
        endpoint_id: number
        endpoint: string
    }, null>("SELECT * FROM endpoints;");

    const rows = selectEndpoints.all(null);
    selectEndpoints.finalize();
    return rows;
}

export const removeDbEndpoint = (endpoint: string): boolean => {
    try {
        const deleteEndpoint = db.prepare<unknown, { $endpoint: string }>(
            "DELETE FROM endpoints WHERE endpoint = $endpoint;"
        );
        deleteEndpoint.run({ $endpoint: endpoint });
        deleteEndpoint.finalize();
        return true;
    } catch (e: unknown) {
        if (e instanceof SQLiteError) {
            console.error(e);
        }
        return false;
    }
}