import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { AllLocales, AppConfig } from './utils/AppConfig';

const intlMiddleware = createMiddleware({
  locales: AllLocales,
  localePrefix: AppConfig.localePrefix,
  defaultLocale: AppConfig.defaultLocale,
});

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/:locale/dashboard(.*)',
  '/onboarding(.*)',
  '/:locale/onboarding(.*)',
  '/api(.*)',
  '/:locale/api(.*)',
]);

export default clerkMiddleware(
  async (auth, req) => {
    // Handle protected routes
    if (isProtectedRoute(req)) {
      const locale = req.nextUrl.pathname.match(/(\/.*)\/dashboard/)?.at(1) ?? '';
      const signInUrl = new URL(`${locale}/sign-in`, req.url);

      await auth.protect({
        unauthenticatedUrl: signInUrl.toString(),
      });
    }

    const authObj = await auth();

    // Handle organization selection redirect
    if (
      authObj.userId
      && !authObj.orgId
      && req.nextUrl.pathname.includes('/dashboard')
      && !req.nextUrl.pathname.endsWith('/organization-selection')
    ) {
      const orgSelection = new URL(
        '/onboarding/organization-selection',
        req.url,
      );

      return NextResponse.redirect(orgSelection);
    }

    return NextResponse.next();
  },
  {
    beforeAuth: intlMiddleware,
    publicRoutes: [
      '/',
      '/:locale',
      '/sign-in(.*)',
      '/:locale/sign-in(.*)',
      '/sign-up(.*)',
      '/:locale/sign-up(.*)',
    ],
  },
);

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next|monitoring).*)', '/', '/(api|trpc)(.*)'], // Also exclude tunnelRoute used in Sentry from the matcher
};