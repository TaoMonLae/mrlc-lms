/**
 * Expression evaluator for the GED practice test's on-screen calculator.
 * A small recursive-descent parser (never `eval`) supporting the operations a
 * GED scientific calculator is used for: + − × ÷, powers, square roots,
 * parentheses, π, percent, and negative numbers.
 */
export type GedCalculatorResult = { ok: true; value: number } | { ok: false; error: string };

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' | '^' | '%' }
  | { kind: 'paren'; value: '(' | ')' }
  | { kind: 'sqrt' }
  | { kind: 'pi' };

function tokenize(input: string): Token[] {
  const source = input
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–]/g, '-')
    .replace(/\s+/g, '');
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (/[0-9.]/.test(char)) {
      const match = /^\d*\.?\d*(?:e[+-]?\d+)?/i.exec(source.slice(index));
      const text = match?.[0] ?? '';
      const value = Number(text);
      if (!text || text === '.' || !Number.isFinite(value)) throw new Error('Check the number format');
      index += text.length;
      if (/[0-9.]/.test(source[index] ?? '')) throw new Error('Check the number format');
      tokens.push({ kind: 'number', value });
    } else if ('+-*/^%'.includes(char)) {
      tokens.push({ kind: 'op', value: char as '+' });
      index += 1;
    } else if (char === '(' || char === ')') {
      tokens.push({ kind: 'paren', value: char });
      index += 1;
    } else if (char === '√') {
      tokens.push({ kind: 'sqrt' });
      index += 1;
    } else if (char === 'π') {
      tokens.push({ kind: 'pi' });
      index += 1;
    } else if (source.startsWith('sqrt', index)) {
      tokens.push({ kind: 'sqrt' });
      index += 4;
    } else if (source.startsWith('pi', index)) {
      tokens.push({ kind: 'pi' });
      index += 2;
    } else {
      throw new Error(`Unsupported key “${char}”`);
    }
  }
  return tokens;
}

export function evaluateGedExpression(input: string): GedCalculatorResult {
  let tokens: Token[];
  try {
    tokens = tokenize(input);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  if (!tokens.length) return { ok: false, error: 'Enter an expression' };
  let position = 0;
  const peek = () => tokens[position];
  const startsOperand = (token: Token | undefined) =>
    Boolean(token && (token.kind === 'number' || token.kind === 'pi' || token.kind === 'sqrt' || (token.kind === 'paren' && token.value === '(')));

  // expression := term (('+' | '-') term)*
  const expression = (): number => {
    let value = term();
    for (let token = peek(); token?.kind === 'op' && (token.value === '+' || token.value === '-'); token = peek()) {
      position += 1;
      const right = term();
      value = token.value === '+' ? value + right : value - right;
    }
    return value;
  };
  // term := unary (('*' | '/' | implicit multiplication) unary)*
  const term = (): number => {
    let value = unary();
    for (;;) {
      const token = peek();
      if (token?.kind === 'op' && (token.value === '*' || token.value === '/')) {
        position += 1;
        const right = unary();
        if (token.value === '/' && right === 0) throw new Error('Cannot divide by zero');
        value = token.value === '*' ? value * right : value / right;
      } else if (startsOperand(token)) {
        value *= unary();
      } else {
        return value;
      }
    }
  };
  // unary := '-' unary | power
  const unary = (): number => {
    const token = peek();
    if (token?.kind === 'op' && (token.value === '-' || token.value === '+')) {
      position += 1;
      const value = unary();
      return token.value === '-' ? -value : value;
    }
    return power();
  };
  // power := postfix ('^' unary)?   (right-associative)
  const power = (): number => {
    const base = postfix();
    const token = peek();
    if (token?.kind === 'op' && token.value === '^') {
      position += 1;
      return base ** unary();
    }
    return base;
  };
  // postfix := primary '%'*
  const postfix = (): number => {
    let value = primary();
    while (peek()?.kind === 'op' && (peek() as { value: string }).value === '%') {
      position += 1;
      value /= 100;
    }
    return value;
  };
  const primary = (): number => {
    const token = peek();
    if (!token) throw new Error('The expression is incomplete');
    position += 1;
    if (token.kind === 'number') return token.value;
    if (token.kind === 'pi') return Math.PI;
    if (token.kind === 'sqrt') {
      const value = postfix();
      if (value < 0) throw new Error('No real square root of a negative number');
      return Math.sqrt(value);
    }
    if (token.kind === 'paren' && token.value === '(') {
      const value = expression();
      const closing = peek();
      // A missing final ")" is closed automatically, as on most calculators.
      if (closing?.kind === 'paren' && closing.value === ')') position += 1;
      return value;
    }
    throw new Error('Check the operator placement');
  };

  try {
    const value = expression();
    if (position < tokens.length) throw new Error('Check the parentheses and operators');
    if (!Number.isFinite(value)) throw new Error('The result is too large');
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/** Formats a result like a classroom calculator: up to 10 significant digits, no float noise. */
export function formatGedCalculatorValue(value: number): string {
  if (Object.is(value, -0) || value === 0) return '0';
  const rounded = Number(value.toPrecision(10));
  const absolute = Math.abs(rounded);
  if (absolute >= 1e10 || absolute < 1e-6) return rounded.toExponential(6).replace(/\.?0+e/, 'e');
  return String(rounded);
}
