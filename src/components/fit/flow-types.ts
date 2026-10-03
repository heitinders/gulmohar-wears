import type {StyleId} from '@/lib/fit/styles';
import type {Field, Landmarks, Measures} from '@/lib/fit/measures';
import type {Calibration} from '@/lib/fit/calibrate';
import type {PoseQuality} from '@/lib/fit/retake';
import {defaultPreference, type FitPreference} from '@/lib/fit/fit-preference';
import type {OrderBrief} from '@/lib/enquiries/messages';

export interface Draft {measures: Measures; raw: Measures; confidence: Record<Field, number>; calibration: Calibration | null; frontLm: Landmarks | null; sideLm: Landmarks | null; quality: PoseQuality | null}
export interface FlowState {name: string; styleId: StyleId; heightCm: number | null; kameezOverrideCm: number | null; front: Blob | null; side: Blob | null; attempts: number; draft: Draft | null; preference: FitPreference; brief: OrderBrief; profileId: string | null}
export const emptyBrief: OrderBrief = {fabric: '', occasion: '', city: '', deadline: '', notes: ''};
export const initialFlow: FlowState = {name: '', styleId: 'punjabi', heightCm: null, kameezOverrideCm: null, front: null, side: null, attempts: 0, draft: null, preference: defaultPreference, brief: emptyBrief, profileId: null};
export interface StepProps {state: FlowState; update(patch: Partial<FlowState>): void}
