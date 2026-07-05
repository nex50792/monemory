import { ApiErrors } from '@/lib/apiError';
import { UnauthorizedError } from '@/lib/errors';
import { GeminiOverloadedError, transcribeAudio } from '@/lib/gemini';
import { getCurrentUser } from '@/lib/getCurrentUser';
import {
  RATE_LIMIT_VOICE,
  checkAndRecordRateLimit,
} from '@/lib/rateLimit';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    const rl = await checkAndRecordRateLimit(
      user.id,
      RATE_LIMIT_VOICE.action,
      RATE_LIMIT_VOICE.limit,
      RATE_LIMIT_VOICE.windowMs,
    );
    if (!rl.ok) {
      return ApiErrors.rateLimited(rl.retryAfterSeconds ?? 60);
    }

    const form = await req.formData();
    const audio = form.get('audio');

    if (!(audio instanceof Blob)) {
      return ApiErrors.badRequest('audio file is required', {
        field: 'audio',
      });
    }

    const transcript = (await transcribeAudio(audio)).trim();
    if (!transcript) {
      return ApiErrors.unsupportedMedia(
        '音声が認識できませんでした。もう一度話してください。',
      );
    }

    return NextResponse.json({ transcript });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return ApiErrors.unauthorized();
    }
    if (error instanceof GeminiOverloadedError) {
      return ApiErrors.geminiOverloaded();
    }
    console.error('voice error:', error);
    return ApiErrors.internal();
  }
}
