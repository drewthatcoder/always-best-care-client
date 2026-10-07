export const CONFIRM_FAILURE_MESSAGE = 'Could not confirm booking. Check your connection and try again.';
export const CONNECTION_MESSAGE = 'Check your connection and try again.';

const NETWORK_PATTERN = /abort|timed out|timeout|network request failed|failed to fetch|fetcherror|unknownhost|unknown host|sockettimeout|socketexception|econnreset|econnrefused|enotfound|eai_again|offline|unable to resolve host|hostname|java\.net|javax\.net|nsurlerrordomain|okhttp|the internet connection appears to be offline|network error/i;

export function errorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return '';
}

export function isNetworkFailure(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'object') {
    const name = 'name' in error ? String((error as { name: unknown }).name) : '';
    const code = 'code' in error ? String((error as { code: unknown }).code) : '';
    if (name === 'AbortError' || code === '20' || code === 'ABORT_ERR') return true;
  }
  return NETWORK_PATTERN.test(errorText(error));
}

export function isDuplicateKey(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code: unknown }).code) : '';
  return code === '23505' || /duplicate key value violates unique constraint/i.test(errorText(error));
}

/** Keeps useful server messages and replaces native network exceptions. */
export function friendlyAlertMessage(error: unknown, fallback: string): string {
  if (isNetworkFailure(error)) return CONNECTION_MESSAGE;
  const message = errorText(error).trim();
  if (!message) return fallback;
  if (/exception|java\.|android\.|okhttp|nsurl|econn|errno|fetcherror|typeerror:/i.test(message)) return fallback;
  return message;
}
