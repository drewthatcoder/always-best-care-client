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

export const CARD_LOAD_FAILURE_MESSAGE = "Couldn't load your card";

function errorName(error: unknown): string {
  if (error && typeof error === 'object' && 'name' in error) return String((error as { name: unknown }).name);
  return '';
}

function responseStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object' || !('context' in error)) return null;
  const context = (error as { context?: unknown }).context;
  if (context && typeof context === 'object' && 'status' in context) {
    const status = (context as { status: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return null;
}

function looksUndeployed(error: unknown): boolean {
  const context = error && typeof error === 'object' && 'context' in error
    ? (error as { context?: unknown }).context
    : undefined;
  const text = `${errorText(error)} ${errorText(context)}`.toLowerCase();
  return /not found|not_found|not deployed|does not exist/.test(text);
}

/**
 * The payment function is not deployed: HTTP 404, a relay miss, or a fetch
 * error that is not a dropped connection. Network failures and HTTP 5xx are not this.
 */
export function isUndeployedPaymentFunction(error: unknown): boolean {
  const status = responseStatus(error);
  if (status != null && status >= 500) return false;
  if (isNetworkFailure(error)) return false;
  const context = error && typeof error === 'object' && 'context' in error
    ? (error as { context?: unknown }).context
    : undefined;
  if (isNetworkFailure(context)) return false;

  const name = errorName(error);
  if (name === 'FunctionsHttpError') return status === 404 || looksUndeployed(error);
  if (name === 'FunctionsRelayError' || name === 'FunctionsFetchError') return true;
  return looksUndeployed(error);
}

/** Keeps useful server messages and replaces native network exceptions. */
export function friendlyAlertMessage(error: unknown, fallback: string): string {
  if (isNetworkFailure(error)) return CONNECTION_MESSAGE;
  const message = errorText(error).trim();
  if (!message) return fallback;
  if (/exception|java\.|android\.|okhttp|nsurl|econn|errno|fetcherror|typeerror:/i.test(message)) return fallback;
  return message;
}
