type Token = { type: 'number' | 'operator' | 'function' | 'left' | 'right'; value: string };

const FUNCTIONS: Record<string, (value: number) => number> = {
  sin: (value) => Math.sin(value * Math.PI / 180),
  cos: (value) => Math.cos(value * Math.PI / 180),
  tan: (value) => Math.tan(value * Math.PI / 180),
  sqrt: Math.sqrt,
  log: Math.log10,
  ln: Math.log,
};

const PRECEDENCE: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3, 'u-': 3 };

function tokenize(input: string): Token[] {
  const normalized = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, String(Math.PI));
  const tokens: Token[] = [];
  let index = 0;
  while (index < normalized.length) {
    const rest = normalized.slice(index);
    const whitespace = rest.match(/^\s+/);
    if (whitespace) { index += whitespace[0].length; continue; }
    const number = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) { tokens.push({ type: 'number', value: number[0] }); index += number[0].length; continue; }
    const name = rest.match(/^[a-z]+/i);
    if (name) {
      if (name[0] === 'e') tokens.push({ type: 'number', value: String(Math.E) });
      else if (FUNCTIONS[name[0]]) tokens.push({ type: 'function', value: name[0] });
      else throw new Error('Fungsi tidak dikenali');
      index += name[0].length;
      continue;
    }
    const char = normalized[index];
    if ('+-*/^'.includes(char)) tokens.push({ type: 'operator', value: char });
    else if (char === '(') tokens.push({ type: 'left', value: char });
    else if (char === ')') tokens.push({ type: 'right', value: char });
    else throw new Error('Karakter tidak valid');
    index += 1;
  }
  return tokens;
}

export function calculateScientificExpression(expression: string): number {
  const tokens = tokenize(expression);
  const output: Token[] = [];
  const operators: Token[] = [];

  tokens.forEach((token, index) => {
    if (token.type === 'number') output.push(token);
    else if (token.type === 'function') operators.push(token);
    else if (token.type === 'operator') {
      const previous = tokens[index - 1];
      const value = token.value === '-' && (!previous || previous.type === 'operator' || previous.type === 'left') ? 'u-' : token.value;
      const current = { ...token, value };
      while (operators.length) {
        const top = operators[operators.length - 1];
        if (top.type === 'left') break;
        const higher = top.type === 'function' || PRECEDENCE[top.value] > PRECEDENCE[value];
        const equalAndLeft = PRECEDENCE[top.value] === PRECEDENCE[value] && value !== '^' && value !== 'u-';
        if (!higher && !equalAndLeft) break;
        output.push(operators.pop()!);
      }
      operators.push(current);
    } else if (token.type === 'left') operators.push(token);
    else {
      while (operators.length && operators[operators.length - 1].type !== 'left') output.push(operators.pop()!);
      if (!operators.length) throw new Error('Kurung tidak seimbang');
      operators.pop();
      if (operators[operators.length - 1]?.type === 'function') output.push(operators.pop()!);
    }
  });
  while (operators.length) {
    const token = operators.pop()!;
    if (token.type === 'left') throw new Error('Kurung tidak seimbang');
    output.push(token);
  }

  const values: number[] = [];
  output.forEach((token) => {
    if (token.type === 'number') values.push(Number(token.value));
    else if (token.type === 'function') {
      if (!values.length) throw new Error('Ekspresi belum lengkap');
      values.push(FUNCTIONS[token.value](values.pop()!));
    } else if (token.type === 'operator') {
      if (token.value === 'u-') { values.push(-values.pop()!); return; }
      if (values.length < 2) throw new Error('Ekspresi belum lengkap');
      const right = values.pop()!;
      const left = values.pop()!;
      const result = token.value === '+' ? left + right
        : token.value === '-' ? left - right
          : token.value === '*' ? left * right
            : token.value === '/' ? left / right
              : left ** right;
      values.push(result);
    }
  });
  if (values.length !== 1 || !Number.isFinite(values[0])) throw new Error('Hasil tidak valid');
  return Number(values[0].toPrecision(12));
}
