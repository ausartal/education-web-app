'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calculator, Grid3X3, X, Delete, RotateCcw } from 'lucide-react';
import { calculateScientificExpression } from '@/lib/scientific-calculator';

type Tool = 'calculator' | 'periodic' | null;
type ElementTuple = readonly [string, string, string];
type SelectedElement = { element: ElementTuple; number: number };

const ELEMENTS = [
  ['H','Hydrogen','1.008'],['He','Helium','4.003'],['Li','Lithium','6.94'],['Be','Beryllium','9.012'],['B','Boron','10.81'],['C','Carbon','12.011'],['N','Nitrogen','14.007'],['O','Oxygen','15.999'],['F','Fluorine','18.998'],['Ne','Neon','20.180'],
  ['Na','Sodium','22.990'],['Mg','Magnesium','24.305'],['Al','Aluminium','26.982'],['Si','Silicon','28.085'],['P','Phosphorus','30.974'],['S','Sulfur','32.06'],['Cl','Chlorine','35.45'],['Ar','Argon','39.948'],['K','Potassium','39.098'],['Ca','Calcium','40.078'],
  ['Sc','Scandium','44.956'],['Ti','Titanium','47.867'],['V','Vanadium','50.942'],['Cr','Chromium','51.996'],['Mn','Manganese','54.938'],['Fe','Iron','55.845'],['Co','Cobalt','58.933'],['Ni','Nickel','58.693'],['Cu','Copper','63.546'],['Zn','Zinc','65.38'],
  ['Ga','Gallium','69.723'],['Ge','Germanium','72.630'],['As','Arsenic','74.922'],['Se','Selenium','78.971'],['Br','Bromine','79.904'],['Kr','Krypton','83.798'],['Rb','Rubidium','85.468'],['Sr','Strontium','87.62'],['Y','Yttrium','88.906'],['Zr','Zirconium','91.224'],
  ['Nb','Niobium','92.906'],['Mo','Molybdenum','95.95'],['Tc','Technetium','[98]'],['Ru','Ruthenium','101.07'],['Rh','Rhodium','102.91'],['Pd','Palladium','106.42'],['Ag','Silver','107.87'],['Cd','Cadmium','112.41'],['In','Indium','114.82'],['Sn','Tin','118.71'],
  ['Sb','Antimony','121.76'],['Te','Tellurium','127.60'],['I','Iodine','126.90'],['Xe','Xenon','131.29'],['Cs','Caesium','132.91'],['Ba','Barium','137.33'],['La','Lanthanum','138.91'],['Ce','Cerium','140.12'],['Pr','Praseodymium','140.91'],['Nd','Neodymium','144.24'],
  ['Pm','Promethium','[145]'],['Sm','Samarium','150.36'],['Eu','Europium','151.96'],['Gd','Gadolinium','157.25'],['Tb','Terbium','158.93'],['Dy','Dysprosium','162.50'],['Ho','Holmium','164.93'],['Er','Erbium','167.26'],['Tm','Thulium','168.93'],['Yb','Ytterbium','173.05'],
  ['Lu','Lutetium','174.97'],['Hf','Hafnium','178.49'],['Ta','Tantalum','180.95'],['W','Tungsten','183.84'],['Re','Rhenium','186.21'],['Os','Osmium','190.23'],['Ir','Iridium','192.22'],['Pt','Platinum','195.08'],['Au','Gold','196.97'],['Hg','Mercury','200.59'],
  ['Tl','Thallium','204.38'],['Pb','Lead','207.2'],['Bi','Bismuth','208.98'],['Po','Polonium','[209]'],['At','Astatine','[210]'],['Rn','Radon','[222]'],['Fr','Francium','[223]'],['Ra','Radium','[226]'],['Ac','Actinium','[227]'],['Th','Thorium','232.04'],
  ['Pa','Protactinium','231.04'],['U','Uranium','238.03'],['Np','Neptunium','[237]'],['Pu','Plutonium','[244]'],['Am','Americium','[243]'],['Cm','Curium','[247]'],['Bk','Berkelium','[247]'],['Cf','Californium','[251]'],['Es','Einsteinium','[252]'],['Fm','Fermium','[257]'],
  ['Md','Mendelevium','[258]'],['No','Nobelium','[259]'],['Lr','Lawrencium','[266]'],['Rf','Rutherfordium','[267]'],['Db','Dubnium','[268]'],['Sg','Seaborgium','[269]'],['Bh','Bohrium','[270]'],['Hs','Hassium','[277]'],['Mt','Meitnerium','[278]'],['Ds','Darmstadtium','[281]'],
  ['Rg','Roentgenium','[282]'],['Cn','Copernicium','[285]'],['Nh','Nihonium','[286]'],['Fl','Flerovium','[289]'],['Mc','Moscovium','[290]'],['Lv','Livermorium','[293]'],['Ts','Tennessine','[294]'],['Og','Oganesson','[294]'],
] as const;

const bySymbol = new Map<string, SelectedElement>(ELEMENTS.map((element, index) => [element[0], { element, number: index + 1 }]));

const PERIODIC_ROWS: Array<Array<string | null>> = [
  ['H', ...Array(16).fill(null), 'He'],
  ['Li', 'Be', ...Array(10).fill(null), 'B', 'C', 'N', 'O', 'F', 'Ne'],
  ['Na', 'Mg', ...Array(10).fill(null), 'Al', 'Si', 'P', 'S', 'Cl', 'Ar'],
  ['K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr'],
  ['Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe'],
  ['Cs','Ba','57–71','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi','Po','At','Rn'],
  ['Fr','Ra','89–103','Rf','Db','Sg','Bh','Hs','Mt','Ds','Rg','Cn','Nh','Fl','Mc','Lv','Ts','Og'],
];

function elementTone(number: number) {
  if ([2,10,18,36,54,86,118].includes(number)) return 'border-indigo-200 bg-indigo-50 text-indigo-800';
  if ([9,17,35,53,85,117].includes(number)) return 'border-cyan-200 bg-cyan-50 text-cyan-800';
  if ((number >= 57 && number <= 71) || (number >= 89 && number <= 103)) return 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800';
  if ([1,6,7,8,15,16,34].includes(number)) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return 'border-slate-200 bg-white text-slate-700';
}

function ScientificCalculator() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const append = (value: string) => setExpression((current) => current + value);
  const solve = () => {
    try { setResult(String(calculateScientificExpression(expression))); }
    catch { setResult('Ekspresi tidak valid'); }
  };
  const scientificKeys = [
    ['sin(', 'sin'], ['cos(', 'cos'], ['tan(', 'tan'], ['sqrt(', '√'],
    ['log(', 'log'], ['ln(', 'ln'], ['^', 'xʸ'], ['π', 'π'],
  ];
  const keypad = [
    ['AC', 'backspace', '(', ')'],
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+'],
  ];
  const press = (key: string) => {
    if (key === 'AC') { setExpression(''); setResult('0'); }
    else if (key === 'backspace') setExpression((value) => value.slice(0, -1));
    else if (key === '=') solve();
    else append(key);
  };

  return (
    <div className="p-2.5 sm:p-4">
      <div className="mb-2 rounded-lg bg-slate-950 px-3 py-2 text-right text-white">
        <div className="h-4 truncate text-[10px] text-slate-400">{expression || '0'}</div>
        <div className="min-h-6 truncate text-lg font-bold tabular-nums">{result}</div>
      </div>
      <div className="mb-2 grid grid-cols-4 gap-1.5">
        {scientificKeys.map(([value, label]) => <button key={value} onClick={() => append(value)} className="h-7 rounded-md bg-violet-50 text-[10px] font-bold text-violet-700 active:scale-95">{label}</button>)}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {keypad.flat().map((key) => {
          const isNumber = /^\d$|^\.$/.test(key);
          const isEquals = key === '=';
          const isClear = key === 'AC';
          return <button key={key} onClick={() => press(key)} aria-label={key === 'backspace' ? 'Hapus karakter' : key} className={`flex h-9 items-center justify-center rounded-md text-xs font-bold transition active:scale-95 ${isEquals ? 'bg-violet-600 text-white' : isClear ? 'bg-rose-50 text-rose-600' : isNumber ? 'bg-white text-slate-800 ring-1 ring-slate-200' : 'bg-slate-100 text-slate-700'}`}>{key === 'backspace' ? <Delete size={14}/> : key === 'AC' ? <><RotateCcw size={11} className="mr-1"/>AC</> : key}</button>;
        })}
      </div>
      <p className="mt-1.5 text-[9px] text-slate-400">Fungsi trigonometri menggunakan derajat.</p>
    </div>
  );
}

function PeriodicTable() {
  const [selected, setSelected] = useState<SelectedElement>(bySymbol.get('H')!);
  const renderElement = (symbol: string, number: number, name: string, mass: string) => (
    <button key={symbol} onClick={() => setSelected({ element: [symbol, name, mass], number })} className={`h-11 rounded border px-0.5 text-center transition hover:-translate-y-0.5 hover:shadow-sm ${elementTone(number)} ${selected.number === number ? 'ring-2 ring-violet-500 ring-offset-1' : ''}`} title={`${number}. ${name}`}>
      <span className="block text-[7px] leading-none opacity-60">{number}</span><span className="block text-xs font-extrabold leading-4">{symbol}</span>
    </button>
  );

  return (
    <div className="p-2.5 sm:p-4">
      <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
        <div className="min-w-0"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Unsur terpilih</span><p className="truncate text-xs font-bold text-slate-800">{selected.number}. {selected.element[1]} ({selected.element[0]})</p></div>
        <div className="shrink-0 text-right"><span className="text-[9px] text-slate-400">Massa atom</span><p className="text-xs font-bold tabular-nums text-violet-700">{selected.element[2]}</p></div>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[760px]">
          <div className="mb-1 grid grid-cols-18 gap-1 px-0.5 text-center text-[8px] font-bold text-slate-400">
            {Array.from({ length: 18 }, (_, index) => <span key={index}>{index + 1}</span>)}
          </div>
          <div className="space-y-1">
            {PERIODIC_ROWS.map((row, period) => (
              <div key={period} className="grid grid-cols-18 gap-1">
                {row.map((symbol, index) => {
                  if (!symbol) return <span key={index}/>;
                  if (symbol.includes('–')) return <span key={symbol} className="flex h-11 items-center justify-center rounded border border-dashed border-fuchsia-200 bg-fuchsia-50 text-[8px] font-bold text-fuchsia-600">{symbol}</span>;
                  const item = bySymbol.get(symbol)!;
                  return renderElement(symbol, item.number, item.element[1], item.element[2]);
                })}
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-l-2 border-fuchsia-200 pl-[84px]">
            {[ELEMENTS.slice(56, 71), ELEMENTS.slice(88, 103)].map((series, row) => (
              <div key={row} className="grid grid-cols-15 gap-1">
                {series.map((element) => { const item = bySymbol.get(element[0])!; return renderElement(element[0], item.number, element[1], element[2]); })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="text-[9px] text-slate-400 sm:hidden">Geser tabel ke kanan untuk melihat golongan berikutnya.</p>
    </div>
  );
}

export function ExamUtilityTools() {
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const toggle = (tool: Exclude<Tool, null>) => setActiveTool((current) => current === tool ? null : tool);
  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 sm:bottom-6 sm:right-6">
        <button onClick={() => toggle('calculator')} aria-label="Buka kalkulator saintifik" aria-pressed={activeTool === 'calculator'} className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition hover:-translate-y-0.5 ${activeTool === 'calculator' ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}><Calculator size={19}/></button>
        <button onClick={() => toggle('periodic')} aria-label="Buka tabel periodik" aria-pressed={activeTool === 'periodic'} className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition hover:-translate-y-0.5 ${activeTool === 'periodic' ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}><Grid3X3 size={19}/></button>
      </div>
      <AnimatePresence>
        {activeTool && (
          <motion.section initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.14 }} className={`fixed bottom-16 right-3 z-50 max-h-[46dvh] w-[min(320px,calc(100vw-1.5rem))] overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 sm:bottom-6 sm:right-20 sm:max-h-[520px] ${activeTool === 'calculator' ? 'sm:w-[360px]' : 'sm:w-[min(680px,calc(100vw-7rem))]'}`}>
            <header className="flex h-10 items-center justify-between border-b border-slate-100 px-3 sm:h-12 sm:px-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">{activeTool === 'calculator' ? <Calculator size={16}/> : <Grid3X3 size={16}/>} {activeTool === 'calculator' ? 'Kalkulator Saintifik' : 'Tabel Periodik'}</div>
              <button onClick={() => setActiveTool(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Perkecil alat"><X size={17}/></button>
            </header>
            <div className="max-h-[calc(46dvh-2.5rem)] overflow-y-auto sm:max-h-[472px]">{activeTool === 'calculator' ? <ScientificCalculator/> : <PeriodicTable/>}</div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
