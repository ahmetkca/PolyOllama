import type { ChatResponse } from "ollama";

export async function retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    delayMs: number,
    maxDelayMs: number = 1000
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;
            const delay = Math.min(maxDelayMs, delayMs * Math.pow(2, attempt)) + Math.random() * 100; // Adding jitter
            // console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError; // Rethrow the last error encountered
}

interface MessageMetrics {
    total_duration: number;
    load_duration: number;
    prompt_eval_count: number;
    prompt_eval_duration: number;
    eval_count: number;
    eval_duration: number;
}

interface CalculatedMessageMetrics {
    total_duration: number;
    load_duration: number;
    prompt_eval_count: number;
    prompt_eval_duration: number;
    prompt_eval_rate: number;
    eval_count: number;
    eval_duration: number;
    eval_rate: number;
}


/**
 * Calculates normalized durations in seconds and rates for given message performance metrics.
 * 
 * @param metrics - The raw metrics related to message processing.
 * @returns The calculated metrics including normalized durations and rates.
 */
export function calculateMessageMetrics(metrics: MessageMetrics): CalculatedMessageMetrics {
    const totalDurationInSec = metrics.total_duration / 1e9;
    const loadDurationInSec = metrics.load_duration / 1e9;
    const promptEvalDurationInSec = metrics.prompt_eval_duration / 1e9;
    const evalDurationInSec = metrics.eval_duration / 1e9;

    const promptEvalRate = promptEvalDurationInSec !== 0 ? metrics.prompt_eval_count / promptEvalDurationInSec : 0;
    const evalRate = evalDurationInSec !== 0 ? metrics.eval_count / evalDurationInSec : 0;

    return {
        total_duration: totalDurationInSec,
        load_duration: loadDurationInSec,
        prompt_eval_count: metrics.prompt_eval_count,
        prompt_eval_duration: promptEvalDurationInSec,
        prompt_eval_rate: promptEvalRate,
        eval_count: metrics.eval_count,
        eval_duration: evalDurationInSec,
        eval_rate: evalRate,
    };
}

export const extractChatTitleFromChatResponse = (chatTitleAttempt: string) => {

    // regex should extract the following:
    // title: "Some title1" => Some title1
    // Title: "Some title2" => Some title2
    // title: "I'm title3" => I'm title3
    // title: I'm title6 => I'm title6
    // Title: I'm title7 => I'm title7

    const regex = /title: ?"?([^"]+)"?/i;

    const match = chatTitleAttempt.match(regex);
    if (match) {
        return match[1];
    }
    return null;
}
