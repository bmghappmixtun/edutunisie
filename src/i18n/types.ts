import type messages from '../messages/fr.json';

/**
 * Type-safe message keys via next-intl AppConfig.
 * 
 * With this declaration, `t('invalidKey')` will be a TypeScript error.
 */
declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof messages;
    // Locale comes from routing.locales
  }
}

export {};
