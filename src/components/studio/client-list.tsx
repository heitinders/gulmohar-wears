import {DeleteClient} from './delete-client';
import {OnDevice} from './on-device';
import {getStyle} from '@/lib/fit/styles';
import {FIT_LABELS, NECKLINE_LABELS, SLEEVE_LABELS, type NecklineId, type SleeveId} from '@/lib/fit/fit-preference';
import {briefSummary, waLink} from '@/lib/fit/studio-view';
import {formatPhone} from '@/lib/fit/phone';
import type {ClientRow} from '@/lib/fit/server/store';

const seen = (iso: string) => new Date(iso).toLocaleDateString('en-GB', {timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric'});

/** One card per client. Choices and the order brief only: measurements are never in Supabase. */
export function ClientList({rows, empty, deadlineFirst = false}: {rows: ClientRow[]; empty: string; deadlineFirst?: boolean}) {
  if (!rows.length) return <p className="fit-note">{empty}</p>;
  return <ul className="client-list">{rows.map(r => {
    const choices = [r.style && getStyle(r.style).label, r.fit && FIT_LABELS[r.fit], r.sleeve && SLEEVE_LABELS[r.sleeve as SleeveId], r.neckline && NECKLINE_LABELS[r.neckline as NecklineId]].filter(Boolean).join(', ');
    const brief = briefSummary(r.brief);
    return <li key={r.id} className="client-row">
      <div className="client-head"><h2>{r.name}</h2><OnDevice phone={r.phone}/></div>
      {deadlineFirst && r.brief?.deadline && <p className="client-deadline">Needed {brief.split(', ').pop()}</p>}
      <dl>
        <div><dt>Phone</dt><dd><a className="text-link" href={waLink(r.phone)} target="_blank" rel="noopener noreferrer">WhatsApp {formatPhone(r.phone)}</a></dd></div>
        <div><dt>Choices</dt><dd>{choices || 'None yet'}{r.lengthNote ? `. ${r.lengthNote}` : ''}</dd></div>
        <div><dt>Order brief</dt><dd>{brief || 'None yet'}</dd></div>
        <div><dt>Last seen</dt><dd>{seen(r.updatedAt)}</dd></div>
      </dl>
      <div className="client-actions"><DeleteClient id={r.id} name={r.name}/></div>
    </li>;
  })}</ul>;
}
