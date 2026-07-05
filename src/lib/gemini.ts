import { GoogleGenAI, Type } from '@google/genai';

const CHAT_MODEL = 'gemini-2.5-flash';
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 1536;

const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;

let cachedClient: GoogleGenAI | null = null;
function client(): GoogleGenAI {
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });
  }
  return cachedClient;
}

export class GeminiOverloadedError extends Error {
  readonly cause: unknown;
  constructor(message: string, cause: unknown) {
    super(message);
    this.name = 'GeminiOverloadedError';
    this.cause = cause;
  }
}

function isTransientStatus(err: unknown): number | null {
  const status = (err as { status?: number } | null)?.status;
  if (status === 503 || status === 429) return status;
  return null;
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const transient = isTransientStatus(err);
      if (!transient) throw err;
      if (attempt === RETRY_MAX_ATTEMPTS) break;
      const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
      console.warn(
        `[Gemini ${label}] transient ${transient}, retry ${attempt + 1}/${RETRY_MAX_ATTEMPTS} after ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new GeminiOverloadedError(
    `Gemini ${label} unavailable after retries`,
    lastErr,
  );
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const trimmed = text?.trim();
  if (!trimmed) {
    throw new Error('generateEmbedding: text must not be empty');
  }
  const res = await withRetry(
    () =>
      client().models.embedContent({
        model: EMBEDDING_MODEL,
        contents: trimmed,
        config: { outputDimensionality: EMBEDDING_DIM },
      }),
    'embedding',
  );
  const values = res.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error('generateEmbedding: empty embedding returned');
  }
  return values;
}

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string };

function toGeminiContents(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
}

function joinSystemInstructions(messages: ChatMessage[]): string | undefined {
  const sys = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  return sys.trim() ? sys : undefined;
}

export async function* chatCompletion(
  messages: ChatMessage[],
  options: { model?: string } = {},
): AsyncIterable<string> {
  const stream = await withRetry(
    () =>
      client().models.generateContentStream({
        model: options.model ?? CHAT_MODEL,
        contents: toGeminiContents(messages),
        config: {
          systemInstruction: joinSystemInstructions(messages),
        },
      }),
    'chat-stream',
  );

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) yield text;
  }
}

export type FunctionDeclaration = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export async function* chatWithTools(
  messages: ChatMessage[],
  toolDeclarations: FunctionDeclaration[],
  executor: ToolExecutor,
  options: { model?: string } = {},
): AsyncIterable<string> {
  const model = options.model ?? CHAT_MODEL;
  const systemInstruction = joinSystemInstructions(messages);
  const contents = toGeminiContents(messages);
  const toolConfig = { functionDeclarations: toolDeclarations };

  const initial = await withRetry(
    () =>
      client().models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          tools: [toolConfig],
        },
      }),
    'chat-tools-initial',
  );

  const calls = initial.functionCalls ?? [];
  if (calls.length === 0) {
    if (initial.text) yield initial.text;
    return;
  }

  const responses = await Promise.all(
    calls.map(async (fc) => {
      const args = (fc.args ?? {}) as Record<string, unknown>;
      const response = await executor(fc.name ?? '', args);
      return { name: fc.name ?? '', response };
    }),
  );

  const followupContents = [
    ...contents,
    {
      role: 'model',
      parts: calls.map((fc) => ({
        functionCall: { name: fc.name ?? '', args: fc.args ?? {} },
      })),
    },
    {
      role: 'user',
      parts: responses.map((r) => ({
        functionResponse: { name: r.name, response: r.response },
      })),
    },
  ];

  const stream = await withRetry(
    () =>
      client().models.generateContentStream({
        model,
        contents: followupContents,
        config: {
          systemInstruction,
          tools: [toolConfig],
        },
      }),
    'chat-tools-followup',
  );

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}

const TRANSCRIBE_INSTRUCTION = `あなたは日本語音声文字起こしアシスタントです。
入力された音声をそのまま忠実に日本語テキスト化し、transcript フィールドにのみ格納してJSONで返します。
要約・補足・句読点調整以外の推測は禁止。認識できない場合は空文字列。`;

const TRANSCRIBE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    transcript: { type: Type.STRING },
  },
  required: ['transcript'],
};

export async function transcribeAudio(audio: Blob): Promise<string> {
  const buffer = await audio.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const rawMime = audio.type || 'audio/webm';
  const mimeType = rawMime.split(';')[0];

  const res = await withRetry(
    () =>
      client().models.generateContent({
        model: CHAT_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'この音声を日本語として文字起こししてください。' },
              { inlineData: { data: base64, mimeType } },
            ],
          },
        ],
        config: {
          systemInstruction: TRANSCRIBE_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: TRANSCRIBE_SCHEMA,
        },
      }),
    'transcribe',
  );

  const raw = res.text ?? '';
  let parsed: { transcript?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error('[Gemini transcribe] JSON parse failed:', err);
    throw new Error(
      `Gemini transcribe response could not be parsed: ${raw.slice(0, 200)}`,
    );
  }

  return String(parsed.transcript ?? '');
}

export function resetGeminiClientForTest(): void {
  cachedClient = null;
}
