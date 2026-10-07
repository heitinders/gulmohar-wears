import {Suspense} from 'react';
import {connection} from 'next/server';
import {FocusBar} from '@/components/fit/focus-bar';
import {FitGate} from '@/components/fit/fit-gate';
import {MeasureFlow} from '@/components/fit/measure-flow';
import {fitBackend} from '@/lib/fit/server/deps';

const Waiting = () => <main id="main" className="fit-step"><h1>Find your fit</h1></main>;

export default async function Measure() {
  await connection();
  return <FocusBar backHref="/fit" backLabel="Back"><FitGate required={fitBackend() !== 'off'} next="/fit/measure" fallback={<Waiting/>}><Suspense fallback={<Waiting/>}><MeasureFlow/></Suspense></FitGate></FocusBar>;
}
