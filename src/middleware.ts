import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/api/public/webhook'])

const mergedMiddleware = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  if (process.env.IS_PRIVATE === 'true') {
    const basicAuth = request.headers.get('authorization');

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

  return NextResponse.next();
});

export default mergedMiddleware;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
