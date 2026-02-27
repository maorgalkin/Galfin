/**
 * Returns the user's preferred locale from the browser's language settings.
 * 
 * `toLocaleDateString()` without arguments uses the OS system locale,
 * which may differ from the browser's language preference (e.g. macOS
 * set to en-US but Chrome set to en-GB). Using `navigator.language`
 * ensures dates/times respect the browser's configured language.
 */
export function getUserLocale(): string {
  return navigator.language;
}
