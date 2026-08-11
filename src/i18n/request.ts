import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

/**
 * Server-side request config for next-intl.
 *
 * Loads the right message bundle for the current locale.
 * - Validates locale against the routing config
 * - Falls back to defaultLocale if missing
 *
 * Note: dynamic import path must be relative to THIS file (src/i18n/request.ts)
 *       so `../messages/${locale}.json` resolves to src/messages/${locale}.json
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) 
    ? requested 
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
