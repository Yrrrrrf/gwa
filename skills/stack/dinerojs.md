# Dinero.js

> Immutable, functional library for monetary values in JS/TS. Integer-based math
> (no floats). `npm install dinero.js`. Node 14+, ES modules, tree-shakeable.

## TL;DR

- **What**: create `Dinero` objects from an integer amount + currency, then
  transform them with pure functions (`add`, `multiply`, `convert`, `toDecimal`,
  …).
- **Best for**: prices, invoices, carts, tax, currency conversion, payment
  gateway integrations, anywhere float math would lose cents.
- **Mental model**:
  `{ amount: integer, currency: { code, base, exponent }, scale }`. `amount` is
  stored in **minor units** (500 USD = $5.00). `scale` is precision; defaults to
  currency exponent, auto-grows during calculations to preserve precision.
- **Anti-use**: if you just need to display a static number, use
  `Intl.NumberFormat`. If you need arbitrary-precision decimals with symbolic
  math, use `big.js` or `decimal.js` directly.

## Setup

```js
// Standard (number amounts, safe up to ~$90T)
import { add, dinero, multiply, subtract, toDecimal } from "dinero.js";
import { EUR, USD } from "dinero.js/currencies";

const price = dinero({ amount: 5000, currency: USD }); // $50.00
const total = add(price, dinero({ amount: 1000, currency: USD })); // $60.00
toDecimal(total); // "60.00"
```

```js
// bigint variant (for crypto, huge amounts, high-exponent currencies)
import { add, dinero } from "dinero.js/bigint";
import { USD } from "dinero.js/bigint/currencies"; // MUST use bigint currencies
const d = dinero({ amount: 500n, currency: USD });
```

### Entry points

| Import path                   | Contents                                                         |
| ----------------------------- | ---------------------------------------------------------------- |
| `dinero.js`                   | Core functions (`number` amounts)                                |
| `dinero.js/currencies`        | ISO 4217 currency objects for `number`                           |
| `dinero.js/bigint`            | Core functions (`bigint` amounts) + `calculator`, `createDinero` |
| `dinero.js/bigint/currencies` | ISO 4217 currency objects for `bigint`                           |

### UMD / CDN

```html
<script
  src="https://cdn.jsdelivr.net/npm/dinero.js/dist/umd/index.production.js"
></script>
<script>
  const { dinero, add, USD } = window.dinerojs;
</script>
```

## Mental model

### Dinero object shape

```js
// toSnapshot(d) always returns:
{ amount: 500, currency: { code: 'USD', base: 10, exponent: 2 }, scale: 2 }
```

- **amount**: integer in minor units. `amount / base^scale` = human value.
  `500 / 10^2 = 5.00`.
- **currency.exponent**: how many minor units per major unit (USD=2, JPY=0,
  BHD=3).
- **scale**: precision of _this_ object. Defaults to `currency.exponent`. Grows
  during math (never shrinks except via `trimScale`).
- **currency.base**: radix. `10` for decimal currencies; `5` for MGA/MRU;
  `[20, 12]` for pre-decimal GBP (array = multiple subdivisions).

### Core invariants

- **All objects are immutable.** Every function returns a new one.
- **Amounts are always integers.** Never pass floats. For fractional values
  (rates, percentages, multipliers), use a `DineroScaledAmount`:
  `{ amount: 89, scale: 2 }` means 0.89.
- **Operations normalize scales** to the highest of the inputs before
  calculating; result keeps that scale.
- **Same-currency required** for
  `add`/`subtract`/`equal`/`compare`/`min`/`max`/`haveSameAmount`/`normalizeScale`.
  Throws at runtime; with typed currencies also rejected at compile time.

### Currency objects

```js
// Built-in (ISO 4217)
import { USD } from 'dinero.js/currencies';
// USD = { code: 'USD', base: 10, exponent: 2 }

// Custom (decimal)
const FRF = { code: 'FRF', base: 10, exponent: 2 };

// Custom (non-decimal, single subdivision — set exponent: 1)
const MRU = { code: 'MRU', base: 5, exponent: 1 };

// Custom (multiple subdivisions: 1 pound = 20 shillings, 1 shilling = 12 pence)
const GBP_OLD = { code: 'GBP', base: [20, 12], exponent: 1 };

// Typed (enables currency-mismatch compile errors)
import type { DineroCurrency } from 'dinero.js';
const FRF = {
  code: 'FRF', base: 10, exponent: 2,
} as const satisfies DineroCurrency<number, 'FRF'>;
```

## Constructor

### `dinero({ amount, currency, scale? })` — `Dinero<TAmount, TCurrency>`

Create a Dinero object.

```js
dinero({ amount: 500, currency: USD }); // $5.00
dinero({ amount: 35, currency: USD, scale: 3 }); // $0.035
dinero({ amount: 5000n, currency: USD }); // bigint variant
dinero({ amount: 12000, currency: GBP_OLD }); // 50 pre-decimal pounds
dinero(toSnapshot(existingD)); // restore from snapshot
```

| Param      | Type                      | Required | Notes                                      |
| ---------- | ------------------------- | -------- | ------------------------------------------ |
| `amount`   | `TAmount`                 | yes      | Integer in minor units.                    |
| `currency` | `DineroCurrency<TAmount>` | yes      | Must match amount type (number vs bigint). |
| `scale`    | `TAmount`                 | no       | Defaults to `currency.exponent`.           |

Gotchas: passing a float `amount` (e.g., `19.99`) is invalid — convert first
(`Math.round(19.99 * 100)` → `1999`). For bigint, base/exponent in currency must
also be bigint — never mix `dinero.js/currencies` with `dinero.js/bigint`.

## Mutations

### `add(augend, addend)` — `Dinero`

Adds two Dineros. Same-currency required.

```js
add(d1, d2);
// Sum many:
[d1, d2, d3].reduce(add);
```

### `subtract(minuend, subtrahend)` — `Dinero`

Subtracts. Same-currency required.

```js
subtract(d1, d2);
[d1, d2, d3].reduce(subtract); // d1 - d2 - d3
```

### `multiply(multiplicand, multiplier, divide?)` — `Dinero`

Multiply by integer or scaled amount. Third arg is rounding mode for when result
isn't integer.

```js
multiply(d, 4); // integer
multiply(d, { amount: 2001, scale: 3 }); // 2.001 (scale grows)
multiply(d, { amount: 21, scale: 1 }, halfEven); // banker's rounding
multiply(d, 0.5); // works ONLY if result is integer, else throws
```

Gotchas: floats throw if result isn't integer. Use scaled amounts
(`{ amount, scale }`) for fractional multipliers — result's scale auto-grows.

### `allocate(dineroObject, ratios)` — `Dinero[]`

Split amount across ratios, distributing remainder fairly (no money is lost).

```js
allocate(d, [50, 50]); // percentages
allocate(d, [1, 3]); // ratios
allocate(d, [0, 50, 50]); // zero ratios → amount 0
allocate(d, [ // scaled ratios for fractional (50.5 / 49.5)
  { amount: 505, scale: 1 },
  { amount: 495, scale: 1 },
]);
```

Gotchas: ratios must be positive, can't pass ONLY zeros. Remainder is
distributed left-to-right so first non-zero bucket gets the extra cent. Use for
tax splits, revenue shares, dividing a bill.

## Conversions (currency & scale)

### `convert(dineroObject, newCurrency, rates)` — `Dinero<TAmount, TNewCurrency>`

Convert to another currency using a `rates` map keyed by target code.

```js
const rates = { EUR: { amount: 89, scale: 2 } }; // 1 USD = 0.89 EUR
convert(d_usd, EUR, rates);

// Reusable converter via closure
const createConverter = (rates) => (d, target) => convert(d, target, rates);
```

Gotchas: currencies must share the same `base` — converting USD(base=10) ↔
MGA(base=5) throws. Use scaled amounts for fractional rates, never floats.

### `normalizeScale([d1, d2, ...])` — `Dinero[]`

Bring all objects to the highest scale in the set.

```js
const [a, b] = normalizeScale([
  dinero({ amount: 100, currency: USD, scale: 2 }),
  dinero({ amount: 2000, currency: USD, scale: 3 }),
]); // both emerge at scale 3
```

### `transformScale(dineroObject, newScale, divide?)` — `Dinero`

Force a new scale. Shrinking loses precision → pass a rounding mode.

```js
transformScale(d, 4); // grow scale, no loss
transformScale(d, 2, halfEven); // shrink, round half-to-even
// Default divide is `down` if omitted.
```

### `trimScale(dineroObject)` — `Dinero`

Drop trailing precision down to the currency exponent (no info loss).

```js
trimScale(dinero({ amount: 500000, currency: USD, scale: 5 }));
// → amount 500, scale 2
```

## Rounding modes

All used as the last arg of `multiply`, `allocate`, or `transformScale`.

| Fn                 | Behavior                                         | 1.5 | 2.5 | -1.5 |
| ------------------ | ------------------------------------------------ | --- | --- | ---- |
| `up`               | toward +∞                                        | 2   | 3   | -1   |
| `down`             | toward -∞ (default for `transformScale`)         | 1   | 2   | -2   |
| `halfUp`           | half → +∞ (classic)                              | 2   | 3   | -1   |
| `halfDown`         | half → -∞                                        | 1   | 2   | -2   |
| `halfEven`         | half → nearest even (**banker's**, reduces bias) | 2   | 2   | -2   |
| `halfOdd`          | half → nearest odd                               | 1   | 3   | -1   |
| `halfTowardsZero`  | half → 0                                         | 1   | 2   | -1   |
| `halfAwayFromZero` | half → away from 0 ("commercial")                | 2   | 3   | -2   |

```js
import { halfEven, multiply } from "dinero.js";
multiply(d, { amount: 21, scale: 1 }, halfEven);
```

## Comparisons

All are pure predicates or selectors. Same-currency required for everything
except `hasSubUnits`, `isZero/Positive/Negative`, `haveSameCurrency`.

| Fn                   | Signature    | Returns        | Notes                                        |
| -------------------- | ------------ | -------------- | -------------------------------------------- |
| `equal`              | `(d1, d2)`   | `boolean`      | Same-value after scale normalization.        |
| `compare`            | `(d1, d2)`   | `-1 \| 0 \| 1` | For `.sort(compare)`.                        |
| `greaterThan`        | `(d1, d2)`   | `boolean`      |                                              |
| `greaterThanOrEqual` | `(d1, d2)`   | `boolean`      |                                              |
| `lessThan`           | `(d1, d2)`   | `boolean`      |                                              |
| `lessThanOrEqual`    | `(d1, d2)`   | `boolean`      |                                              |
| `minimum`            | `([d, ...])` | `Dinero`       | Takes an **array**.                          |
| `maximum`            | `([d, ...])` | `Dinero`       | Takes an **array**.                          |
| `haveSameAmount`     | `([d, ...])` | `boolean`      | Same-value across a set.                     |
| `haveSameCurrency`   | `([d, ...])` | `boolean`      | Works across different currencies.           |
| `isZero`             | `(d)`        | `boolean`      |                                              |
| `isPositive`         | `(d)`        | `boolean`      | Zero → `false`.                              |
| `isNegative`         | `(d)`        | `boolean`      | Zero → `false`.                              |
| `hasSubUnits`        | `(d)`        | `boolean`      | True if `amount` has fractional major units. |

```js
compare(
  dinero({ amount: 800, currency: USD }),
  dinero({ amount: 500, currency: USD }),
); // 1
[d1, d2, d3].sort(compare); // low → high
[d1, d2, d3].sort((a, b) => compare(b, a)); // high → low
minimum([d1, d2, d3]); // pass an array
```

## Formatting

### `toDecimal(dineroObject, transformer?)` — `string` (or `TOutput`)

Stringifies amount at the object's scale. **No currency symbol** — you compose
that.

```js
toDecimal(dinero({ amount: 1050, currency: USD })); // "10.50"
toDecimal(d, ({ value, currency }) => `${currency.code} ${value}`); // "USD 10.50"
```

Gotchas: only works for single-based decimal currencies (fails for
`base: [20,12]`). Scale is fixed by the object — to change decimals in output,
do it in the transformer (`Number(value).toFixed(1)`).

### `toUnits(dineroObject, transformer?)` — `TAmount[]` (or `TOutput`)

Splits amount into per-subdivision units (`[major, minor, ...]`). Works for any
currency.

```js
toUnits(dinero({ amount: 1050, currency: USD })); // [10, 50]
toUnits(
  dinero({
    amount: 267,
    currency: { code: "GBP", base: [20, 12], exponent: 1 },
  }),
);
// [1, 2, 3]  — 1 pound, 2 shillings, 3 pence
toUnits(d, ({ value }) => `${value[0]} dollars, ${value[1]} cents`);
```

### `toSnapshot(dineroObject)` — `DineroSnapshot`

Plain JS object for transport, storage, or inspection. Round-trip:
`dinero(toSnapshot(d))` rebuilds.

```js
toSnapshot(dinero({ amount: 500, currency: USD }));
// { amount: 500, currency: { code: 'USD', base: 10, exponent: 2 }, scale: 2 }
```

## Recipes

### Intl currency formatting (symbols, locales)

```js
const intlFormat = (d, locale, opts = {}) =>
  toDecimal(
    d,
    ({ value, currency }) =>
      Number(value).toLocaleString(locale, {
        ...opts,
        style: "currency",
        currency: currency.code,
      }),
  );

intlFormat(d, "en-US"); // "$10.00"
intlFormat(d, "fr-CA"); // "10,00 $ US"
```

### Calculate a percentage (e.g., 15% tax)

```js
// Option A: allocate
const [tax] = allocate(price, [15, 85]);

// Option B: multiply by scaled amount
const tax = multiply(price, { amount: 15, scale: 2 });

// Reusable
const percentage = (d, share, scale = 0) => {
  const rest = 100 ** (scale + 1) - share;
  return allocate(d, [share, rest], { scale })[0];
};
```

### VAT with precision preservation

```js
const price = dinero({ amount: 1995, currency: EUR }); // €19.95
const tax = multiply(price, { amount: 55, scale: 3 }); // 5.5%
const total = add(price, tax);
// total.amount = 2104725, scale = 5  → €21.04725 (precision kept)
toDecimal(trimScale(transformScale(total, 2, halfEven))); // "21.05"
```

### Create a Dinero from a float (write your own, not provided)

```js
const dineroFromFloat = ({ amount: float, currency, scale }) => {
  const factor = currency.base ** (scale ?? currency.exponent);
  return dinero({ amount: Math.round(float * factor), currency, scale });
};
dineroFromFloat({ amount: 19.99, currency: USD }); // $19.99
```

### Look up a currency by code (from API / DB)

```js
import * as currencies from "dinero.js/currencies";
const getCurrency = (code) => {
  if (!(code in currencies)) throw new Error(`Unknown currency: ${code}`);
  return currencies[code];
};
```

### Currency-bound factory (avoid repeating `currency: USD`)

```js
const usd = (amount) => dinero({ amount, currency: USD });
usd(500); // $5.00
```

### Pipe transformations

```js
import { pipe } from "ramda";
const result = pipe(
  (d) => multiply(d, 2),
  (d) => add(d, fee),
  (d) => toDecimal(d),
)(price);
```

### Transport over HTTP (number)

```js
// Client → server
fetch('/api/order', { method: 'POST', body: JSON.stringify({ price: dinero(...) }) });
// (JSON.stringify works on a Dinero directly — it serializes the snapshot shape)

// Server → restore
const price = dinero(JSON.parse(body).price);
```

### Transport over HTTP (bigint) — `JSON.stringify` doesn't handle bigint

```js
const replacer = (k, v) => typeof v === "bigint" ? String(v) : v;
fetch("/api/order", {
  method: "POST",
  body: JSON.stringify(product, replacer),
});
// On receive, cast strings back to bigint before calling dinero().
```

### Store in SQL (recommended: columns)

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price_amount BIGINT NOT NULL,
  price_currency VARCHAR(3) NOT NULL,
  price_exponent INTEGER NOT NULL DEFAULT 2
);
```

```js
// Restore
dinero({
  amount: row.price_amount,
  currency: {
    code: row.price_currency,
    base: 10,
    exponent: row.price_exponent,
  },
});
```

Tip: if you use a custom `scale` ≠ currency exponent, persist `scale` too.

### Store in SQL (JSONB / JSON column)

```js
await db.query("INSERT INTO products (price) VALUES ($1)", [
  JSON.stringify(toSnapshot(price)),
]);
// Restore: dinero(row.price)
```

### Store in MongoDB (snapshot embedded; Decimal128 for bigint)

```js
await col.insertOne({ price: toSnapshot(price) });
// Restore: dinero(doc.price)

// For bigint amounts, use Decimal128 for the amount field
balance: {
  amount: Decimal128.fromString(String(snapshot.amount)),
  currency: snapshot.currency,
  scale: snapshot.scale,
}
```

### Payment gateway adapters

```js
// Stripe / Adyen / Square (minor units + ISO code)
const toStripe = (d) => {
  const { amount, currency } = toSnapshot(d);
  return { amount, currency: currency.code.toLowerCase() }; // Stripe wants lowercase
};
const toAdyen = (d) => {
  const s = toSnapshot(d);
  return { value: s.amount, currency: s.currency.code };
};
const toSquare = (d) => {
  const s = toSnapshot(d);
  return { amount: BigInt(s.amount), currency: s.currency.code };
};

// PayPal (major units as string)
const toPaypal = (d) => ({
  value: toDecimal(d),
  currency_code: toSnapshot(d).currency.code,
});
```

### Cryptocurrency (use bigint)

```js
import { add, dinero } from "dinero.js/bigint";
const ETH = { code: "ETH", base: 10n, exponent: 18n };
const wallet = dinero({ amount: 1000000000000000000n, currency: ETH }); // 1 ETH
```

Tip: don't name files `xmr.js`/`xbt.js` — adblockers block them.

### Custom amount type (e.g., `big.js`)

```ts
import Big from "big.js";
import { createDinero, DineroCalculator, DineroFormatter } from "dinero.js";

const calculator: DineroCalculator<Big> = {
  add: (a, b) => a.plus(b),
  subtract: (a, b) => a.minus(b),
  multiply: (a, b) => a.times(b),
  integerDivide: (a, b) => a.div(b).round(0, Big.roundDown),
  modulo: (a, b) => a.mod(b),
  compare: (a, b) => a.cmp(b) as any,
  increment: (v) => v.plus(new Big(1)),
  decrement: (v) => v.minus(new Big(1)),
  power: (a, b) => a.pow(Number(b)),
  zero: () => new Big(0),
};
const formatter: DineroFormatter<Big> = {
  toNumber: (v) => v.toNumber(),
  toString: (v) => v.toFixed(), // avoid "1e+22" scientific notation
};
const bigDinero = createDinero({ calculator, formatter });
```

### Format non-decimal currency (ancient / fictional)

```js
const GRD = { code: "GRD", base: 6, exponent: 1 }; // drachma / obol
toUnits(
  dinero({ amount: 9, currency: GRD }),
  ({ value }) =>
    value.filter((n) => n > 0)
      .map((n, i) => `${n} ${["drachma", "obol"][i]}${n > 1 ? "s" : ""}`)
      .join(", "),
); // "1 drachma, 3 obols"
```

### TypeScript: prevent currency mismatches at compile time

```ts
import { EUR, USD } from "dinero.js/currencies"; // already typed as const
const usd = dinero({ amount: 500, currency: USD }); // Dinero<number, 'USD'>
const eur = dinero({ amount: 100, currency: EUR }); // Dinero<number, 'EUR'>
add(usd, eur); // ❌ TS error: 'EUR' not assignable to 'USD'
```

## Gotchas

- **Don't pass floats to `amount`.** Always integers in minor units. `$19.99` →
  `{ amount: 1999 }`.
- **`multiply(d, 0.5)` throws if result isn't integer.** Use
  `{ amount: 5, scale: 1 }` instead.
- **bigint + number mixing throws `TypeError`.** Currencies from
  `dinero.js/currencies` have `number` base/exponent;
  `dinero.js/bigint/currencies` has `bigint`. Never cross-import.
- **Currency data changes between versions.** ISO 4217 amendments ship in minor
  releases (exponent changes, codes removed). Pin your version or define your
  own currencies for stability. Validate codes from DB/API at runtime.
- **`convert` requires same `base`.** USD (10) ↔ MGA (5) throws.
- **Scale auto-grows but never shrinks** unless you call `trimScale` or
  `transformScale`. After many multiplications on `number` amounts you can hit
  `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991). Use `trimScale`
  periodically or switch to bigint.
- **Non-decimal currencies need `exponent: 1`**, not 0. And `toDecimal` won't
  work — only `toUnits` handles multi-subdivision currencies.
- **`JSON.stringify` on bigint Dineros throws.** Use a
  `(key, value) => typeof value === 'bigint' ? String(value) : value` replacer,
  and cast back on deserialize.
- **`PostgreSQL money` type is lossy.** Locale-dependent, fixed 2 decimals, no
  currency — prefer separate columns.
- **Currency symbols are not provided.** `toDecimal` gives `"10.50"`, never
  `"$10.50"`. Use `Intl.NumberFormat` in a transformer.
- **Allocate leaves zero buckets alone.** `allocate(d, [0, 50, 50])` returns
  `[$0, ..., ...]`; the remainder only lands on non-zero ratios.
- **v2 is functions, not methods.** `d.add(x)` → `add(d, x)`. No chaining, by
  design (tree-shaking). Wrap if you want fluent style.
- **No global defaults / no locale on objects.** Each call is explicit; write
  factories for ergonomics.
- **Adblocker file naming**: avoid `xmr.js`, `xbt.js`, etc. for crypto — blocked
  by filter lists.

## Migration from v1.x

```diff
- import Dinero from 'dinero.js';
- Dinero({ amount: 500, currency: 'USD', precision: 3 });
+ import { dinero } from 'dinero.js';
+ import { USD } from 'dinero.js/currencies';
+ dinero({ amount: 500, currency: USD, scale: 3 });          // precision → scale
```

| v1                                                     | v2                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `d.add(x)` / `.subtract` / `.multiply` / `.allocate`   | standalone `add(d,x)` / `subtract` / `multiply` / `allocate` |
| `d.equalsTo(x)` / `.greaterThan` / etc.                | `equal(d,x)` / `greaterThan(d,x)` / etc.                     |
| `d.isZero()` / `.isPositive()` / `.isNegative()`       | `isZero(d)` / `isPositive(d)` / `isNegative(d)`              |
| `d.hasSameAmount(x)` / `.hasSameCurrency(x)`           | `haveSameAmount([d,x])` / `haveSameCurrency([d,x])`          |
| `d.hasSubUnits()`                                      | `hasSubUnits(d)`                                             |
| `Dinero.minimum([…])` / `.maximum([…])`                | `minimum([…])` / `maximum([…])`                              |
| `d.convert(…)` / `.convertPrecision(…)`                | `convert(d,…)` / `transformScale(d,…)`                       |
| `Dinero.normalizePrecision([…])`                       | `normalizeScale([…])`                                        |
| `d.divide(…)`                                          | use `allocate` instead                                       |
| `d.percentage(…)`                                      | build from `allocate` or `multiply`                          |
| `d.getAmount()` / `.getCurrency()` / `.getPrecision()` | `toSnapshot(d)` destructure                                  |
| `d.toObject()`                                         | `toSnapshot(d)`                                              |
| `d.toUnit()` / `.toRoundedUnit()`                      | `toUnits(d)` / `toDecimal(d)`                                |
| `d.toFormat(fmt)` / `.setLocale(…)` / `.getLocale()`   | Dropped — compose via `toDecimal` + `Intl`                   |
| **Floats** accepted in `convert`/`multiply`/`allocate` | **Scaled amounts**: `{ amount: 89, scale: 2 }` for 0.89      |
| `@dinero.js/*` sub-packages                            | All consolidated into `dinero.js`                            |

## Cheat sheet

```js
// CREATE
dinero({ amount: 500, currency: USD })                      // $5.00
dinero({ amount: 35,  currency: USD, scale: 3 })            // $0.035
dinero(snapshot)                                            // restore

// MATH (same currency!)
add(a, b) / subtract(a, b)
multiply(d, 4) / multiply(d, { amount: 21, scale: 1 }, halfEven)
allocate(d, [50, 50]) / allocate(d, [1, 3]) / allocate(d, [0, 50, 50])

// CURRENCY / SCALE
convert(d, EUR, { EUR: { amount: 89, scale: 2 } })
normalizeScale([a, b])  transformScale(d, 2, halfEven)  trimScale(d)

// COMPARE (boolean)
equal(a,b) greaterThan(a,b) lessThan(a,b) greaterThanOrEqual(a,b) lessThanOrEqual(a,b)
isZero(d) isPositive(d) isNegative(d) hasSubUnits(d)
haveSameAmount([a,b,…]) haveSameCurrency([a,b,…])

// COMPARE (select / sort)
compare(a, b)           // -1 | 0 | 1, sortable
minimum([…]) / maximum([…])

// FORMAT
toDecimal(d)                              // "5.00"
toDecimal(d, ({ value, currency }) => …)  // custom
toUnits(d)                                // [5, 00]
toSnapshot(d)                             // plain object

// ROUNDING MODES (3rd arg of multiply/allocate/transformScale)
up down halfUp halfDown halfEven halfOdd halfTowardsZero halfAwayFromZero
//                       ^^^^^^^^ banker's, preferred for money
```

## Appendix — built-in currencies (selected)

All ISO 4217 codes ship in `dinero.js/currencies`. Exponent ≠ 2 examples to
watch:

| Code                                                         | Currency                | Base | Exp |
| ------------------------------------------------------------ | ----------------------- | ---- | --- |
| `USD` / `EUR` / `GBP` / `CAD` / `AUD` / `CHF` / `CNY` / etc. | (most world currencies) | 10   | 2   |
| `JPY`                                                        | Japanese yen            | 10   | 0   |
| `KRW`                                                        | South Korean won        | 10   | 0   |
| `CLP`                                                        | Chilean peso            | 10   | 0   |
| `BIF` / `DJF` / `RWF` / `VUV` / `XAF` / `XOF` / `XPF`        | Various zero-exponent   | 10   | 0   |
| `BHD` / `IQD` / `JOD` / `KWD` / `LYD` / `OMR` / `TND`        | Gulf/Maghreb dinars     | 10   | 3   |
| `CLF`                                                        | Unidad de Fomento       | 10   | 4   |
| `MGA`                                                        | Malagasy ariary         | 5    | 1   |
| `MRU`                                                        | Mauritanian ouguiya     | 5    | 1   |

For the full list, do `Object.keys(require('dinero.js/currencies'))` or check
`docs/api/currencies` upstream.
