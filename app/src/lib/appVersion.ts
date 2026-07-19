/**
 * Single import point for the app version, used as
 * `PersistQueryClientProvider`'s cache-busting `buster` string (plan section
 * 3.2) so a fresh release doesn't rehydrate a stale on-device query cache.
 */
import {version} from '../../package.json';

export const appVersion: string = version;
