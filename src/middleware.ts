import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get('authorization');

  if (process.env.IS_PRIVATE !== 'true') {
    return NextResponse.next();
  }

  if (basicAuth) {
    const [, base64] = basicAuth.split(' ');
    const [user, pwd] = atob(base64).split(':');

    if (
      user === process.env.BASIC_AUTH_USER &&
      pwd === process.env.BASIC_AUTH_PASS
    ) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

export const config = {
  matcher: ['/:path*'],
};
