import { ApiErrors } from '@/lib/apiError';
import {
  buildContextSummary,
  buildRagSystemPrompt,
} from '@/lib/chatRetrieval';
import { CHAT_TOOL_DECLARATIONS, createChatToolExecutor } from '@/lib/chatTools';
import { UnauthorizedError } from '@/lib/errors';
import {
  chatWithTools,
  GeminiOverloadedError,
  type ChatMessage,
} from '@/lib/gemini';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import {
  RATE_LIMIT_CHAT,
  checkAndRecordRateLimit,
} from '@/lib/rateLimit';

const HISTORY_WINDOW = 10;

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    const rl = await checkAndRecordRateLimit(
      user.id,
      RATE_LIMIT_CHAT.action,
      RATE_LIMIT_CHAT.limit,
      RATE_LIMIT_CHAT.windowMs,
    );
    if (!rl.ok) {
      return ApiErrors.rateLimited(rl.retryAfterSeconds ?? 60);
    }

    const body = await req.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return ApiErrors.badRequest('message is required', { field: 'message' });
    }

    await prisma.chatMessage.create({
      data: { userId: user.id, role: 'user', content: message },
    });

    const [summary, recent] = await Promise.all([
      buildContextSummary(user.id),
      prisma.chatMessage.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_WINDOW,
      }),
    ]);
    const historyChron = recent.slice().reverse();

    const systemPrompt = buildRagSystemPrompt(summary);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historyChron.map((m) => ({
        role:
          m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      })),
    ];

    const executor = createChatToolExecutor(user.id);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let full = '';
        try {
          for await (const chunk of chatWithTools(
            messages,
            CHAT_TOOL_DECLARATIONS,
            executor,
          )) {
            full += chunk;
            const payload = JSON.stringify({ delta: chunk });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
          if (full.trim()) {
            await prisma.chatMessage.create({
              data: {
                userId: user.id,
                role: 'assistant',
                content: full,
              },
            });
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          console.error('chat stream error:', err);
          const payload =
            err instanceof GeminiOverloadedError
              ? JSON.stringify({
                  code: 'GEMINI_OVERLOADED',
                  message:
                    'AIサービスが混雑しています。数秒後にもう一度お試しください。',
                })
              : JSON.stringify({
                  code: 'INTERNAL_ERROR',
                  message: 'サーバーエラーが発生しました',
                });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          controller.enqueue(encoder.encode('data: [ERROR]\n\n'));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return ApiErrors.unauthorized();
    }
    if (error instanceof GeminiOverloadedError) {
      return ApiErrors.geminiOverloaded();
    }
    console.error('chat error:', error);
    return ApiErrors.internal();
  }
}
