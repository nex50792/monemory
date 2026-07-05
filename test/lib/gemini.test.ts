import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockEmbedContent = vi.fn();
const mockGenerateContent = vi.fn();
const mockGenerateContentStream = vi.fn();

vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = {
      embedContent: mockEmbedContent,
      generateContent: mockGenerateContent,
      generateContentStream: mockGenerateContentStream,
    };
  }
  return {
    GoogleGenAI: MockGoogleGenAI,
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      INTEGER: 'INTEGER',
      BOOLEAN: 'BOOLEAN',
      ARRAY: 'ARRAY',
    },
  };
});

describe('lib/gemini', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'dummy-test-key';
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('generateEmbedding', () => {
    it('returns 1536-dim vector for input text', async () => {
      const vec = new Array(1536).fill(0).map((_, i) => i * 0.001);
      mockEmbedContent.mockResolvedValueOnce({
        embeddings: [{ values: vec }],
      });

      const { generateEmbedding } = await import('@/lib/gemini');
      const result = await generateEmbedding('ランチに1200円使った');

      expect(result).toHaveLength(1536);
      expect(mockEmbedContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-embedding-001',
          contents: 'ランチに1200円使った',
          config: { outputDimensionality: 1536 },
        }),
      );
    });

    it('throws when text is empty', async () => {
      const { generateEmbedding } = await import('@/lib/gemini');
      await expect(generateEmbedding('')).rejects.toThrow();
      await expect(generateEmbedding('   ')).rejects.toThrow();
    });

    it('throws when embedding is empty', async () => {
      mockEmbedContent.mockResolvedValueOnce({ embeddings: [{ values: [] }] });
      const { generateEmbedding } = await import('@/lib/gemini');
      await expect(generateEmbedding('foo')).rejects.toThrow();
    });
  });

  describe('chatCompletion', () => {
    it('yields streaming text chunks and drops system messages into systemInstruction', async () => {
      const chunks = ['こん', 'にち', 'は'];
      mockGenerateContentStream.mockImplementationOnce(async () => {
        return (async function* () {
          for (const c of chunks) yield { text: c };
        })();
      });

      const { chatCompletion } = await import('@/lib/gemini');
      const collected: string[] = [];
      for await (const chunk of chatCompletion([
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'hi' },
      ])) {
        collected.push(chunk);
      }

      expect(collected).toEqual(chunks);
      const call = mockGenerateContentStream.mock.calls[0][0];
      expect(call.model).toBe('gemini-2.5-flash');
      expect(call.config.systemInstruction).toBe('You are helpful.');
      expect(call.contents).toEqual([
        { role: 'user', parts: [{ text: 'hi' }] },
      ]);
    });

    it('skips empty text chunks', async () => {
      mockGenerateContentStream.mockImplementationOnce(async () => {
        return (async function* () {
          yield {};
          yield { text: 'a' };
          yield { text: '' };
        })();
      });

      const { chatCompletion } = await import('@/lib/gemini');
      const collected: string[] = [];
      for await (const chunk of chatCompletion([
        { role: 'user', content: 'hi' },
      ])) {
        collected.push(chunk);
      }
      expect(collected).toEqual(['a']);
    });

    it('maps assistant role to model for Gemini', async () => {
      mockGenerateContentStream.mockImplementationOnce(async () => {
        return (async function* () {
          yield { text: 'ok' };
        })();
      });

      const { chatCompletion } = await import('@/lib/gemini');
      const collected: string[] = [];
      for await (const c of chatCompletion([
        { role: 'user', content: 'q' },
        { role: 'assistant', content: 'a' },
        { role: 'user', content: 'q2' },
      ])) {
        collected.push(c);
      }
      const call = mockGenerateContentStream.mock.calls[0][0];
      expect(call.contents).toEqual([
        { role: 'user', parts: [{ text: 'q' }] },
        { role: 'model', parts: [{ text: 'a' }] },
        { role: 'user', parts: [{ text: 'q2' }] },
      ]);
    });
  });

  describe('chatWithTools', () => {
    it('yields text directly when no function calls', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'no tool needed',
        functionCalls: undefined,
      });

      const { chatWithTools } = await import('@/lib/gemini');
      const executor = vi.fn();
      const chunks: string[] = [];
      for await (const c of chatWithTools(
        [{ role: 'user', content: 'hello' }],
        [],
        executor,
      )) {
        chunks.push(c);
      }

      expect(chunks.join('')).toBe('no tool needed');
      expect(executor).not.toHaveBeenCalled();
    });

    it('executes tool then streams follow-up response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        functionCalls: [
          { name: 'search_entries', args: { query: 'ランチ' } },
        ],
      });
      const executor = vi.fn().mockResolvedValueOnce({
        entries: [{ id: 'e1' }],
      });
      mockGenerateContentStream.mockImplementationOnce(async () => {
        return (async function* () {
          yield { text: '結果は ' };
          yield { text: '1 件です' };
        })();
      });

      const { chatWithTools } = await import('@/lib/gemini');
      const chunks: string[] = [];
      for await (const c of chatWithTools(
        [
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'q' },
        ],
        [
          {
            name: 'search_entries',
            description: 'x',
            parameters: {},
          },
        ],
        executor,
      )) {
        chunks.push(c);
      }

      expect(chunks.join('')).toBe('結果は 1 件です');
      expect(executor).toHaveBeenCalledWith('search_entries', { query: 'ランチ' });

      const followupCall = mockGenerateContentStream.mock.calls[0][0];
      const contents = followupCall.contents;
      const lastRole = contents[contents.length - 1].role;
      const lastParts = contents[contents.length - 1].parts;
      expect(lastRole).toBe('user');
      expect(lastParts[0].functionResponse.name).toBe('search_entries');
    });
  });

  describe('retry on transient errors', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('retries on 503 and eventually succeeds', async () => {
      const err503 = Object.assign(new Error('overloaded'), { status: 503 });
      mockGenerateContent
        .mockRejectedValueOnce(err503)
        .mockRejectedValueOnce(err503)
        .mockResolvedValueOnce({
          text: JSON.stringify({ transcript: 'ok' }),
        });

      const { transcribeAudio } = await import('@/lib/gemini');
      const audio = new Blob([new Uint8Array([1])], { type: 'audio/webm' });
      const promise = transcribeAudio(audio);
      promise.catch(() => {});
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('ok');
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it('throws GeminiOverloadedError after exhausting retries', async () => {
      const err503 = Object.assign(new Error('overloaded'), { status: 503 });
      mockGenerateContent.mockRejectedValue(err503);

      const { transcribeAudio, GeminiOverloadedError } = await import(
        '@/lib/gemini'
      );
      const audio = new Blob([new Uint8Array([1])], { type: 'audio/webm' });
      const promise = transcribeAudio(audio);
      promise.catch(() => {});
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toBeInstanceOf(GeminiOverloadedError);
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
    });

    it('does not retry on non-transient errors (e.g. 400)', async () => {
      const err400 = Object.assign(new Error('bad request'), { status: 400 });
      mockGenerateContent.mockRejectedValueOnce(err400);

      const { transcribeAudio } = await import('@/lib/gemini');
      const audio = new Blob([new Uint8Array([1])], { type: 'audio/webm' });
      const promise = transcribeAudio(audio);
      promise.catch(() => {});

      await expect(promise).rejects.toThrow('bad request');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('retries on 429 rate limit as well', async () => {
      const err429 = Object.assign(new Error('rate limit'), { status: 429 });
      mockGenerateContent
        .mockRejectedValueOnce(err429)
        .mockResolvedValueOnce({ text: JSON.stringify({ transcript: 'ok' }) });

      const { transcribeAudio } = await import('@/lib/gemini');
      const audio = new Blob([new Uint8Array([1])], { type: 'audio/webm' });
      const promise = transcribeAudio(audio);
      promise.catch(() => {});
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('ok');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });
  });

  describe('transcribeAudio', () => {
    it('returns transcript string from audio blob', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ transcript: 'ランチに1200円使った' }),
      });

      const { transcribeAudio } = await import('@/lib/gemini');
      const audio = new Blob([new Uint8Array([1, 2, 3])], {
        type: 'audio/webm',
      });
      const result = await transcribeAudio(audio);

      expect(result).toBe('ランチに1200円使った');
      const call = mockGenerateContent.mock.calls[0][0];
      expect(call.contents[0].parts[1].inlineData.mimeType).toBe('audio/webm');
      expect(call.config.responseMimeType).toBe('application/json');
      expect(call.config.responseSchema.required).toContain('transcript');
    });

    it('strips codec suffix from mimeType', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ transcript: 'a' }),
      });
      const { transcribeAudio } = await import('@/lib/gemini');
      const audio = new Blob([new Uint8Array([1])], {
        type: 'audio/webm;codecs=opus',
      });
      await transcribeAudio(audio);
      const call = mockGenerateContent.mock.calls[0][0];
      expect(call.contents[0].parts[1].inlineData.mimeType).toBe('audio/webm');
    });

    it('returns empty string when transcript is missing', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ transcript: '' }),
      });
      const { transcribeAudio } = await import('@/lib/gemini');
      const result = await transcribeAudio(
        new Blob([new Uint8Array([1])], { type: 'audio/webm' }),
      );
      expect(result).toBe('');
    });

    it('throws when response is malformed JSON', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'not-json' });
      const { transcribeAudio } = await import('@/lib/gemini');
      await expect(
        transcribeAudio(
          new Blob([new Uint8Array([1])], { type: 'audio/webm' }),
        ),
      ).rejects.toThrow();
    });
  });
});
