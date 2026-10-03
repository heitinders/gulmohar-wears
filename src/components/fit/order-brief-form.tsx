'use client';
import type {OrderBrief} from '@/lib/enquiries/messages';

const fabrics = ['Silk', 'Georgette', 'Organza', 'Velvet', 'Chanderi', 'Help me choose'];
const occasions = ['Wedding', 'Wedding guest', 'Celebration', 'Everyday dressing', 'Something else'];

export function OrderBriefForm({value, onChange}: {value: OrderBrief; onChange(next: OrderBrief): void}) {
  const set = (patch: Partial<OrderBrief>) => onChange({...value, ...patch});
  return <details className="fit-panel"><summary>Add order details <span className="optional">Optional</span></summary>
    <fieldset><legend>A fabric in mind?</legend><div className="chips">{fabrics.map(f => <button key={f} type="button" className="chip" aria-pressed={value.fabric === f} onClick={() => set({fabric: value.fabric === f ? '' : f})}>{f}</button>)}</div></fieldset>
    <div className="fit-field"><label htmlFor="occasion">The occasion</label><select id="occasion" value={value.occasion} onChange={e => set({occasion: e.target.value})}><option value="">Select your occasion</option>{occasions.map(o => <option key={o}>{o}</option>)}</select></div>
    <div className="fit-field"><label htmlFor="city">Delivery city and country</label><input id="city" maxLength={150} placeholder="For example, Toronto, Canada" value={value.city} onChange={e => set({city: e.target.value})}/></div>
    <div className="fit-field"><label htmlFor="deadline">Needed by</label><input id="deadline" type="date" value={value.deadline} onChange={e => set({deadline: e.target.value})}/></div>
    <div className="fit-field"><label htmlFor="notes">Notes</label><textarea id="notes" rows={3} maxLength={500} placeholder="Colour, embroidery, anything the tailor should know" value={value.notes} onChange={e => set({notes: e.target.value})}/></div>
  </details>;
}
