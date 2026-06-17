// Shared Gemini API utility for all AI features

const GEMINI_API_KEY = () => (import.meta.env.VITE_GEMINI_API_KEY || '').trim();

// Models in priority order — if the first is rate-limited, try the next
const MODELS = ['gemini-2.5-flash'];

const geminiUrl = (model: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY()}`;
const geminiStreamUrl = (model: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY()}`;

export interface GeminiMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

/**
 * Convert chat messages (role: user/assistant) to Gemini format
 */
export function toGeminiMessages(
    messages: { role: string; content: string }[]
): GeminiMessage[] {
    return messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
    }));
}

/**
 * Build a system instruction + messages payload for Gemini
 */
function buildPayload(
    messages: GeminiMessage[],
    systemInstruction?: string,
    options?: { temperature?: number; maxOutputTokens?: number }
) {
    const payload: any = {
        contents: messages,
        generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxOutputTokens ?? 8192,
        },
    };
    if (systemInstruction) {
        payload.systemInstruction = {
            parts: [{ text: systemInstruction }],
        };
    }
    return payload;
}

/**
 * Check if error is a rate limit / quota exhaustion error
 */
function isRateLimitError(status: number, body?: string): boolean {
    if (status === 429 || status === 503) return true;
    if (body && (body.includes('RESOURCE_EXHAUSTED') || body.includes('quota'))) return true;
    return false;
}

/**
 * Sleep for ms milliseconds
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with retry + model fallback for rate limits
 * Tries each model with exponential backoff before moving to the next
 */
async function fetchWithRetry(
    urlFn: (model: string) => string,
    payload: any,
    maxRetries = 2
): Promise<Response> {
    const apiKey = GEMINI_API_KEY();
    if (!apiKey) throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.');

    for (const model of MODELS) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const response = await fetch(urlFn(model), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) return response;

            const errorBody = await response.text();

            if (isRateLimitError(response.status, errorBody)) {
                // Extract retry delay from error if available
                const retryMatch = errorBody.match(/retryDelay.*?(\d+)s/);
                const baseDelay = retryMatch ? parseInt(retryMatch[1]) * 1000 : 2000;
                const delay = baseDelay * Math.pow(2, attempt);

                if (attempt < maxRetries) {
                    console.warn(`Rate limited on ${model} (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay / 1000}s...`);
                    await sleep(delay);
                    continue;
                }
                // All retries exhausted for this model — try next model
                console.warn(`Rate limit exhausted for ${model}. Trying next model...`);
                break;
            }

            // Non-rate-limit error — throw immediately
            throw new Error(`Gemini API error (${response.status}): ${errorBody.slice(0, 200)}`);
        }
    }

    throw new Error('AI is temporarily busy due to rate limits. Please wait 30-60 seconds and try again.');
}

/**
 * Generate content with Gemini (non-streaming)
 * Returns the text response directly
 */
export async function generateContent(
    prompt: string,
    systemInstruction?: string,
    options?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
    const payload = buildPayload(
        [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction,
        options
    );

    const response = await fetchWithRetry(geminiUrl, payload);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Chat with Gemini (non-streaming) using conversation history
 */
export async function chatWithGemini(
    messages: { role: string; content: string }[],
    systemInstruction?: string,
    options?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
    const geminiMessages = toGeminiMessages(messages);
    const payload = buildPayload(geminiMessages, systemInstruction, options);

    const response = await fetchWithRetry(geminiUrl, payload);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Stream chat with Gemini using SSE
 * Calls onChunk with each text chunk as it arrives
 * Returns the complete response text
 */
export async function streamChatWithGemini(
    messages: { role: string; content: string }[],
    systemInstruction?: string,
    onChunk?: (chunk: string, fullText: string) => void,
    options?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
    const geminiMessages = toGeminiMessages(messages);
    const payload = buildPayload(geminiMessages, systemInstruction, options);

    const response = await fetchWithRetry(geminiStreamUrl, payload);

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;

            try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    fullText += text;
                    onChunk?.(text, fullText);
                }
            } catch {
                // Skip malformed JSON chunks
            }
        }
    }

    return fullText;
}

/**
 * Stream chat with Gemini using a file (PDF, etc.) as inline data
 * The file is sent as base64 alongside the text prompt
 */
export async function streamChatWithGeminiFile(
    textPrompt: string,
    fileBase64: string,
    fileMimeType: string,
    systemInstruction?: string,
    onChunk?: (chunk: string, fullText: string) => void,
    options?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
    const apiKey = GEMINI_API_KEY();
    if (!apiKey) throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.');

    const payload: any = {
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            mimeType: fileMimeType,
                            data: fileBase64,
                        },
                    },
                    { text: textPrompt },
                ],
            },
        ],
        generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxOutputTokens ?? 8192,
        },
    };
    if (systemInstruction) {
        payload.systemInstruction = {
            parts: [{ text: systemInstruction }],
        };
    }

    const response = await fetchWithRetry(geminiStreamUrl, payload);

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;

            try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    fullText += text;
                    onChunk?.(text, fullText);
                }
            } catch {
                // Skip malformed JSON chunks
            }
        }
    }

    return fullText;
}

/**
 * Generate JSON content with Gemini and parse it
 */
export async function generateJSON<T = any>(
    prompt: string,
    systemInstruction?: string,
    options?: { temperature?: number; maxOutputTokens?: number }
): Promise<T> {
    const content = await generateContent(prompt, systemInstruction, options);
    // Clean up potential markdown code blocks
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
}
