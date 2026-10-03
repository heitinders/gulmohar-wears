import {Suspense} from 'react';
import {FocusBar} from '@/components/fit/focus-bar';
import {MeasureFlow} from '@/components/fit/measure-flow';

export default function Measure(){return <FocusBar backHref="/fit" backLabel="Back"><Suspense fallback={<main id="main" className="fit-step"><h1>Find your fit</h1></main>}><MeasureFlow/></Suspense></FocusBar>;}
