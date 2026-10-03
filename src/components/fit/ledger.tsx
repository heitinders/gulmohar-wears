import {getStyle, type StyleId} from '@/lib/fit/styles';
import {confidenceLevel, sourceLabel} from '@/lib/fit/confidence';
import {formatCm, formatIn} from '@/lib/fit/units';
import type {Field} from '@/lib/fit/measures';
import type {Draft} from './flow-types';

const UPPER: [Field, string][] = [['bust', 'Bust'], ['waist', 'Waist'], ['hip', 'Hip'], ['shoulder', 'Shoulder'], ['acrossBack', 'Across back'], ['armhole', 'Armhole'], ['sleeve', 'Sleeve length'], ['kameez', 'Kameez length'], ['neck', 'Neck']];

export function Ledger({draft, styleId}: {draft: Draft; styleId: StyleId}) {
  const style = getStyle(styleId);
  const row = (key: Field, label: string) => {
    const cm = draft.measures[key], pct = draft.confidence[key]; const [num, unit = ''] = formatIn(cm).split(' '); // NO_MEASURE has no unit, so a corrupt saved value shows n/a instead of throwing
    return <div className="ledger-row" key={key}>
      <dt>{label}<small>{sourceLabel(draft.measures.sources[key], key, styleId)}</small></dt>
      <dd><span className="ledger-in">{num}<small>{unit.toUpperCase()}</small></span><span className="ledger-cm">{formatCm(cm)}</span></dd>
      <dd className="conf" data-level={confidenceLevel(pct)}><div className="conf-bar" aria-hidden="true"><span style={{width: `${pct}%`}}/></div><span>confidence {pct}%</span></dd>
    </div>;
  };
  // Group titles are headings outside the lists and confidence is a second dd, so each dl holds only dt and dd groups.
  return <div className="ledger">
    <h2 className="ledger-group">Kameez and upper</h2><dl>{UPPER.map(([k, l]) => row(k, k === 'kameez' ? style.kameezLabel : l))}</dl>
    <h2 className="ledger-group">{style.bottomTitle}</h2><dl>{style.bottomRows.map(r => row(r.key, r.label.replace(' / ', ' or ')))}</dl>
  </div>;
}
