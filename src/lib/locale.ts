// Locale helpers: enumerate ALL IANA time zones and ISO 4217 currencies using
// the native Intl APIs (Intl.supportedValuesOf), with curated fallbacks for
// older runtimes that don't support it.

export interface Option {
  value: string;
  label: string;
}

const FALLBACK_TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Africa/Cairo', 'Africa/Johannesburg', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok',
  'Asia/Singapore', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
];

const FALLBACK_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD', 'CHF', 'SGD',
  'MYR', 'THB', 'IDR', 'PHP', 'VND', 'KRW', 'AED', 'SAR', 'ZAR', 'BRL',
];

function supportedValues(key: 'timeZone' | 'currency', fallback: string[]): string[] {
  try {
    const fn = (Intl as any).supportedValuesOf;
    if (typeof fn === 'function') {
      const values = fn(key) as string[];
      if (Array.isArray(values) && values.length) return values;
    }
  } catch {
    /* fall through to fallback */
  }
  return fallback;
}

/** Current short GMT offset for an IANA zone, e.g. "GMT+7". */
function timezoneOffset(tz: string): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName');
    return part?.value || '';
  } catch {
    return '';
  }
}

let currencyDisplay: Intl.DisplayNames | null = null;
try {
  currencyDisplay = new Intl.DisplayNames(['en'], { type: 'currency' });
} catch {
  currencyDisplay = null;
}

function currencyMeta(code: string): { name: string; symbol: string } {
  let name = code;
  try {
    name = currencyDisplay?.of(code) || code;
  } catch {
    /* keep code */
  }
  let symbol = code;
  try {
    symbol =
      new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' })
        .formatToParts(0)
        .find((p) => p.type === 'currency')?.value || code;
  } catch {
    /* keep code */
  }
  return { name, symbol };
}

/** All IANA time zones, sorted, labelled with their current GMT offset. */
export function getTimezones(): Option[] {
  const zones = supportedValues('timeZone', FALLBACK_TIMEZONES);
  return zones
    .map((tz) => {
      const off = timezoneOffset(tz);
      return { value: tz, label: off ? `${tz.replace(/_/g, ' ')} (${off})` : tz.replace(/_/g, ' ') };
    })
    .sort((a, b) => a.value.localeCompare(b.value));
}

/**
 * Format a monetary amount using the school's configured ISO 4217 currency.
 * Falls back to "CODE 1,234.00" if the runtime can't format the code.
 */
export function formatMoney(
  amount: number,
  currency: string | undefined | null,
  opts: { decimals?: boolean } = {},
): string {
  const code = (currency || 'USD').toUpperCase();
  const fractionDigits = opts.decimals === false ? 0 : 2;
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    return `${code} ${value.toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })}`;
  }
}

/** All ISO 4217 currencies, sorted by code, labelled "CODE — Name (symbol)". */
export function getCurrencies(): Option[] {
  const codes = supportedValues('currency', FALLBACK_CURRENCIES);
  return codes
    .map((code) => {
      const { name, symbol } = currencyMeta(code);
      const label = symbol && symbol !== code ? `${code} — ${name} (${symbol})` : `${code} — ${name}`;
      return { value: code, label };
    })
    .sort((a, b) => a.value.localeCompare(b.value));
}
