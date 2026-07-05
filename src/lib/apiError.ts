import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'GEMINI_OVERLOADED'
  | 'UNSUPPORTED_MEDIA'
  | 'INTERNAL_ERROR';

export type ApiErrorBody = {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  init?: { headers?: Record<string, string>; details?: Record<string, unknown> },
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    code,
    message,
    ...(init?.details ? { details: init.details } : {}),
  };
  return NextResponse.json(body, {
    status,
    headers: init?.headers,
  });
}

export const ApiErrors = {
  unauthorized: () => apiError('AUTH_REQUIRED', '認証が必要です', 401),
  badRequest: (message: string, details?: Record<string, unknown>) =>
    apiError('BAD_REQUEST', message, 400, details ? { details } : undefined),
  notFound: (message = 'データが見つかりません') =>
    apiError('NOT_FOUND', message, 404),
  rateLimited: (retryAfterSeconds: number) =>
    apiError(
      'RATE_LIMITED',
      `リクエスト回数の上限に達しました。${retryAfterSeconds}秒後にお試しください。`,
      429,
      { headers: { 'Retry-After': String(retryAfterSeconds) } },
    ),
  geminiOverloaded: () =>
    apiError(
      'GEMINI_OVERLOADED',
      'AIサービスが混雑しています。数秒後にもう一度お試しください。',
      503,
    ),
  unsupportedMedia: (message: string) =>
    apiError('UNSUPPORTED_MEDIA', message, 415),
  internal: (message = 'サーバーエラーが発生しました') =>
    apiError('INTERNAL_ERROR', message, 500),
};
