export interface FormulaPart {
  symbol: string;
  count: number;
  subtotal: number;
}

export interface MolarMassResult {
  total: number;
  parts: FormulaPart[];
}

export function calculateMolarMass(
  formula: string,
  atomicMasses: Record<string, number>,
): MolarMassResult {
  const clean = formula.replace(/\s+/g, '').replace(/·/g, '.');
  if (!clean) throw new Error('Masukkan rumus senyawa');

  const totals = new Map<string, number>();
  const add = (symbol: string, count: number) => totals.set(symbol, (totals.get(symbol) ?? 0) + count);

  const parseSection = (section: string, multiplier = 1) => {
    let index = 0;
    const parseNumber = () => {
      const match = section.slice(index).match(/^\d+/);
      if (!match) return 1;
      index += match[0].length;
      return Number(match[0]);
    };
    const parseGroup = (factor: number, untilClosing = false) => {
      while (index < section.length) {
        if (section[index] === ')') {
          if (!untilClosing) throw new Error('Kurung tidak seimbang');
          index += 1;
          return;
        }
        if (section[index] === '(') {
          index += 1;
          const before = new Map(totals);
          parseGroup(factor, true);
          const groupMultiplier = parseNumber();
          if (groupMultiplier !== 1) {
            totals.forEach((value, symbol) => {
              const initial = before.get(symbol) ?? 0;
              totals.set(symbol, initial + (value - initial) * groupMultiplier);
            });
          }
          continue;
        }
        const element = section.slice(index).match(/^[A-Z][a-z]?/);
        if (!element || atomicMasses[element[0]] === undefined) throw new Error('Simbol unsur tidak dikenali');
        index += element[0].length;
        add(element[0], parseNumber() * factor);
      }
      if (untilClosing) throw new Error('Kurung tidak seimbang');
    };
    parseGroup(multiplier);
  };

  clean.split('.').forEach((section) => {
    const coefficient = section.match(/^\d+/);
    const multiplier = coefficient ? Number(coefficient[0]) : 1;
    parseSection(coefficient ? section.slice(coefficient[0].length) : section, multiplier);
  });

  const parts = [...totals.entries()].map(([symbol, count]) => ({
    symbol,
    count,
    subtotal: atomicMasses[symbol] * count,
  }));
  const total = parts.reduce((sum, part) => sum + part.subtotal, 0);
  return { total: Number(total.toFixed(4)), parts };
}
