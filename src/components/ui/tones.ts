/** Colour families shared by the heroes, empty states and stat tiles. */
export type Tone = 'blue' | 'emerald' | 'violet' | 'amber' | 'teal' | 'rose' | 'indigo';

export const TONE_STYLES: Record<Tone, {
  hero: string;
  soft: string;
  icon: string;
  ring: string;
  bar: string;
  text: string;
}> = {
  blue: { hero: 'from-blue-600 to-cyan-500', soft: 'bg-blue-50', icon: 'text-blue-600', ring: 'ring-blue-100', bar: 'bg-blue-500', text: 'text-blue-700' },
  emerald: { hero: 'from-emerald-600 to-teal-500', soft: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100', bar: 'bg-emerald-500', text: 'text-emerald-700' },
  violet: { hero: 'from-violet-600 to-indigo-600', soft: 'bg-violet-50', icon: 'text-violet-600', ring: 'ring-violet-100', bar: 'bg-violet-500', text: 'text-violet-700' },
  amber: { hero: 'from-amber-500 to-orange-500', soft: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-100', bar: 'bg-amber-500', text: 'text-amber-700' },
  teal: { hero: 'from-teal-600 to-cyan-500', soft: 'bg-teal-50', icon: 'text-teal-600', ring: 'ring-teal-100', bar: 'bg-teal-500', text: 'text-teal-700' },
  rose: { hero: 'from-rose-500 to-pink-500', soft: 'bg-rose-50', icon: 'text-rose-600', ring: 'ring-rose-100', bar: 'bg-rose-500', text: 'text-rose-700' },
  indigo: { hero: 'from-indigo-600 to-violet-600', soft: 'bg-indigo-50', icon: 'text-indigo-600', ring: 'ring-indigo-100', bar: 'bg-indigo-500', text: 'text-indigo-700' },
};
