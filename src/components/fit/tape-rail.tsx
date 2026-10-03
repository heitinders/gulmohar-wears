export type StepId = 'style' | 'photos' | 'result';
export const STEPS: {id: StepId; label: string}[] = [{id: 'style', label: 'Style'}, {id: 'photos', label: 'Photos'}, {id: 'result', label: 'Your fit'}];

/** A tailor's tape as the progress indicator. Progress fills to the start of the current step, fully at the result. */
export function TapeRail({current}: {current: StepId}) {
  const index = STEPS.findIndex(s => s.id === current);
  const width = index === STEPS.length - 1 ? 100 : (index / (STEPS.length - 1)) * 100;
  return <nav aria-label="Progress">
    <div className="tape-rail" aria-hidden="true"><div className="tape-progress" style={{width: `${width}%`}}/></div>
    <ol className="tape-steps">{STEPS.map((s, i) => <li key={s.id} aria-current={s.id === current ? 'step' : undefined} data-done={i < index}><span className="eyebrow">0{i + 1}</span>{s.label}</li>)}</ol>
  </nav>;
}
