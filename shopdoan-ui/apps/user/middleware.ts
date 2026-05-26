import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['vi'],
  defaultLocale: 'vi',
  localePrefix: 'never'
});

export const config = {
  matcher: [
    '/((?!_next|api|.*\\..*).*)' 
  ]
};
