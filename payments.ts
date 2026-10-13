import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { initPaymentSheet, initStripe, presentPaymentSheet } from '@stripe/stripe-react-native';
import { supabase } from './supabase';

/**
 * QA sets EXPO_PUBLIC_STRIPE_FN_SUFFIX to "-test" so the app calls
 * create-setup-intent-test, set-default-payment-method-test, and
 * get-payment-method-test. Those test functions use Stripe test mode.
 * An empty suffix calls the unsuffixed functions. No Stripe key is stored here.
 */
const FUNCTION_SUFFIX = process.env.EXPO_PUBLIC_STRIPE_FN_SUFFIX ?? '';

/** Must match expo.scheme in app.json. 3DS returns through this scheme. */
const URL_SCHEME_FALLBACK = 'alwaysbestcare';

/** Must match the @stripe/stripe-react-native plugin merchantIdentifier in app.json. */
const MERCHANT_IDENTIFIER = 'merchant.com.alwaysbestcare';

export type SavedCard = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

export class CardSetupCanceled extends Error {
  constructor() {
    super('Card setup canceled');
    this.name = 'CardSetupCanceled';
  }
}

type SetupSession = {
  setupIntentClientSecret: string;
  ephemeralKey: string;
  customerId: string;
  publishableKey: string;
};

export function paymentFunctionName(base: string): string {
  return `${base}${FUNCTION_SUFFIX}`;
}

export function stripeUrlScheme(): string {
  const configured = Constants.expoConfig?.scheme;
  if (typeof configured === 'string' && configured.length > 0) return configured;
  if (Array.isArray(configured)) {
    const first = configured.find((value) => typeof value === 'string' && value.length > 0);
    if (typeof first === 'string') return first;
  }
  return URL_SCHEME_FALLBACK;
}

export function setupIntentIdFromClientSecret(clientSecret: string): string {
  const marker = '_secret_';
  const index = clientSecret.indexOf(marker);
  if (!clientSecret.startsWith('seti_') || index <= 'seti_'.length) {
    throw new Error('Could not start card setup.');
  }
  return clientSecret.slice(0, index);
}

export async function getPaymentMethod(): Promise<SavedCard | null> {
  const { data, error } = await supabase.functions.invoke(paymentFunctionName('get-payment-method'));
  if (error) throw error;
  return parseSavedCard(data);
}

export async function saveDefaultCard(): Promise<SavedCard> {
  const session = parseSetupSession(await invokePayment(paymentFunctionName('create-setup-intent')));
  const urlScheme = stripeUrlScheme();

  await initStripe({
    publishableKey: session.publishableKey,
    urlScheme,
    ...(Platform.OS === 'ios'
      ? { merchantIdentifier: MERCHANT_IDENTIFIER }
      : { setReturnUrlSchemeOnAndroid: true }),
  });

  const { error: initError } = await initPaymentSheet({
    setupIntentClientSecret: session.setupIntentClientSecret,
    customerEphemeralKeySecret: session.ephemeralKey,
    customerId: session.customerId,
    merchantDisplayName: 'Always Best Care',
    allowsDelayedPaymentMethods: false,
    returnURL: `${urlScheme}://stripe-redirect`,
  });
  if (initError) {
    if (initError.code === 'Canceled') throw new CardSetupCanceled();
    throw new Error(safeUserMessage(initError.message || 'Could not open the card form.'));
  }

  const { error: presentError } = await presentPaymentSheet();
  if (presentError) {
    if (presentError.code === 'Canceled') throw new CardSetupCanceled();
    throw new Error(safeUserMessage(presentError.message || 'Could not save the card.'));
  }

  const saved = parseSavedCard(
    await invokePayment(paymentFunctionName('set-default-payment-method'), {
      setupIntentId: setupIntentIdFromClientSecret(session.setupIntentClientSecret),
    })
  );
  if (!saved) throw new Error('The card was not saved.');
  return saved;
}

async function invokePayment(name: string, body?: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke(name, body ? { body } : undefined);
  if (error) throw new Error(await messageFromInvokeError(error));
  return data;
}

function parseSetupSession(value: unknown): SetupSession {
  if (!value || typeof value !== 'object') throw new Error('Could not start card setup.');
  const row = value as Record<string, unknown>;
  const setupIntentClientSecret = requiredString(row.setupIntentClientSecret);
  const ephemeralKey = requiredString(row.ephemeralKey);
  const customerId = requiredString(row.customerId);
  const publishableKey = requiredString(row.publishableKey);
  if (
    !setupIntentClientSecret.startsWith('seti_') ||
    !setupIntentClientSecret.includes('_secret_') ||
    !publishableKey.startsWith('pk_') ||
    !ephemeralKey ||
    !customerId
  ) {
    throw new Error('Could not start card setup.');
  }
  return { setupIntentClientSecret, ephemeralKey, customerId, publishableKey };
}

function parseSavedCard(value: unknown): SavedCard | null {
  if (value == null) return null;
  if (typeof value !== 'object') throw new Error('Could not read the card on file.');
  const row = value as Record<string, unknown>;
  const fields = [row.brand, row.last4, row.expMonth, row.expYear];
  if (fields.every((field) => field == null || field === '')) return null;
  const brand = requiredString(row.brand);
  const last4 = requiredString(row.last4);
  const expMonth = Number(row.expMonth);
  const expYear = Number(row.expYear);
  if (!brand || !/^\d{4}$/.test(last4) || !Number.isInteger(expMonth) || !Number.isInteger(expYear)) {
    throw new Error('Could not read the card on file.');
  }
  return { brand, last4, expMonth, expYear };
}

function requiredString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

async function messageFromInvokeError(error: unknown): Promise<string> {
  const fallback = error instanceof Error && error.message ? error.message : 'Something went wrong.';
  const context = (error as { context?: unknown }).context;
  try {
    let body: unknown = context;
    if (context && typeof (context as { json?: unknown }).json === 'function') {
      body = await (context as { json: () => Promise<unknown> }).json();
    }
    const message = shortServerMessage(body);
    if (message) return safeUserMessage(message);
  } catch {
    // The function body was not a short error message.
  }
  return safeUserMessage(fallback);
}

function shortServerMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const record = body as Record<string, unknown>;
  for (const key of ['error', 'message']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim() && value.length <= 240) return value.trim();
  }
  return '';
}

function safeUserMessage(message: string): string {
  if (/_secret_|pk_live_|pk_test_|sk_live_|sk_test_|rk_live_|rk_test_|ek_/i.test(message)) {
    return 'Something went wrong while saving the card.';
  }
  return message;
}
