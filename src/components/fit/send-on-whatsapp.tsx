'use client';
import {useMemo, useState} from 'react';
import {Arrow, MessageIcon} from '../icons';
import {composeMeasurementDraft, composeOrderBrief, whatsappUrl} from '@/lib/enquiries/messages';
import {encodeDraftCode} from '@/lib/fit/handoff';
import {recommendSize} from '@/lib/fit/size-advice';
import {FIELDS, type Values} from '@/lib/fit/measures';
import type {FlowState} from './flow-types';

export function SendOnWhatsApp({state}: {state: FlowState}) {
  const [kind, setKind] = useState<'draft' | 'brief'>('draft');
  const [copied, setCopied] = useState(false);
  const message = useMemo(() => {
    const d = state.draft!; const m = d.measures;
    const code = encodeDraftCode({v: 1, style: state.styleId, fit: state.preference.fit, heightCm: state.heightCm!, calibrated: !!d.calibration, m: Object.fromEntries(FIELDS.map(f => [f, m[f]])) as Values});
    const input = {name: state.name, styleId: state.styleId, preference: state.preference, heightCm: state.heightCm!, measures: m, confidence: d.confidence, calibration: d.calibration, advice: recommendSize(m, state.preference.fit), date: new Date(), code};
    return kind === 'brief' ? composeOrderBrief({...input, brief: state.brief}) : composeMeasurementDraft(input);
  }, [state, kind]);
  const hasBrief = Object.values(state.brief).some(Boolean);
  async function copy() { try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); } }
  return <section className="message-preview" aria-label="Your WhatsApp message">
    <p className="eyebrow">YOUR MESSAGE</p><h3>Check it, then send it to us.</h3>
    {hasBrief && <div className="chips"><button type="button" className="chip" aria-pressed={kind === 'draft'} onClick={() => setKind('draft')}>Measurement draft</button><button type="button" className="chip" aria-pressed={kind === 'brief'} onClick={() => setKind('brief')}>Order brief</button></div>}
    <p className="preserve-lines">{message}</p>
    <a className="button button-primary" href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer"><MessageIcon/> Continue to WhatsApp <Arrow diagonal/></a>
    <div className="chips"><button type="button" className="button button-outline" onClick={copy}>{copied ? 'Copied' : 'Copy the text'}</button></div>
    <p className="field-hint">Opens WhatsApp in a new tab. You choose whether to press send. Nothing is sent until you do.</p>
  </section>;
}
