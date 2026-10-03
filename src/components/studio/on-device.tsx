'use client';
import {useSyncExternalStore} from 'react';
import {browserStudioStore} from '@/lib/fit/studio-store';

const noop = () => () => {};
/** Marks clients whose measures are held on this studio device. The list itself comes from Supabase; the join is by phone (spec 4.1). */
export function OnDevice({phone}: {phone: string}) {
  const held = useSyncExternalStore(noop, () => !!browserStudioStore().get(phone), () => false);
  return held ? <span className="tag">On this device</span> : null;
}
