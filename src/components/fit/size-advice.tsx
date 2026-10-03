import {recommendSize, sizeAdviceLine, SIZE_CHART} from '@/lib/fit/size-advice';
import type {Measures} from '@/lib/fit/measures';
import type {FitId} from '@/lib/fit/fit-preference';

export function SizeAdvicePanel({measures, fit}: {measures: Measures; fit: FitId}) {
  const advice = recommendSize(measures, fit);
  return <section className="fit-panel" aria-labelledby="size-title"><p className="eyebrow draft-eyebrow">DRAFT GUIDE ONLY</p><h2 id="size-title">Size advice</h2>
    <p>{sizeAdviceLine(advice)}</p>
    <p className="fit-note">Our heaviest ready stock is M and L (38 to 40 in bust). Made to measure is always available. This guide is checked against your tape before anything is cut.</p>
    <details><summary>The chart we compared with</summary><table className="fit-chart"><thead><tr><th>Size</th><th>Bust</th><th>Waist</th><th>Hip</th></tr></thead><tbody>{SIZE_CHART.map(b => <tr key={b.size} aria-current={b.size === advice.closest ? 'true' : undefined}><th scope="row">{b.size}</th><td>{b.bustMin} to {b.bustMax} in</td><td>{b.waistMin} to {b.waistMax} in</td><td>{b.hipMin} to {b.hipMax} in</td></tr>)}</tbody></table></details>
  </section>;
}
