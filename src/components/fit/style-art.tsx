import type {StyleId} from '@/lib/fit/styles';

const common = {viewBox: '0 0 90 120', fill: 'none', stroke: 'currentColor', strokeWidth: 1.25, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true} as const;
const head = <><circle cx="45" cy="12" r="7"/><path d="M45 19v5"/></>;

const ART: Record<StyleId, React.ReactNode> = {
  punjabi: <>{head}<path d="M30 24h30l6 46H24z"/><path d="M30 24l-12 4 3 30M60 24l12 4-3 30"/><path d="M28 70l-4 42h16l5-32 5 32h16l-4-42"/><path d="M31 27q14 22 31 41"/></>,
  anarkali: <>{head}<path d="M33 24h24l2 22H31z"/><path d="M31 46L15 112h60L59 46"/><path d="M33 24l-13 4 3 24M57 24l13 4-3 24"/><path d="M36 112v6M54 112v6"/></>,
  sharara: <>{head}<path d="M30 24h30l4 38H26z"/><path d="M30 24l-12 4 3 26M60 24l12 4-3 26"/><path d="M26 62L11 118h33l1-48 1 48h33L64 62"/></>,
  farshi: <>{head}<path d="M30 24h30l5 56H25z"/><path d="M30 24l-12 4 3 30M60 24l12 4-3 30"/><path d="M25 80L13 118h64L65 80"/><path d="M6 118h78"/></>,
};

export function StyleArt({id}: {id: StyleId}) {return <svg {...common}>{ART[id]}</svg>;}
