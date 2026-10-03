import type {Metadata} from 'next';
import {StudioFit} from '@/components/studio/studio-fit';
import {clientOptions} from '../../client-options';

export const metadata: Metadata = {title: 'Fit'};
export default async function Fit() { return <StudioFit clients={await clientOptions()}/>; }
