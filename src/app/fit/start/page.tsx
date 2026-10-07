import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {connection} from 'next/server';
import {FocusBar} from '@/components/fit/focus-bar';
import {ConsentGate} from '@/components/fit/consent-gate';
import {fitBackend} from '@/lib/fit/server/deps';
import {countryOptions} from '@/lib/fit/phone';
import {safeNext} from '@/lib/fit/gate-next';

export const metadata: Metadata = {title: 'Before we measure'};

export default async function Start({searchParams}: {searchParams: Promise<{next?: string | string[]}>}) {
  await connection();
  const next = safeNext((await searchParams).next);
  // Without a backend there is nowhere to keep consent, so measuring stays open exactly as in part 1.
  if (fitBackend() === 'off') redirect(next);
  return <FocusBar backHref="/fit" backLabel="Back"><ConsentGate countries={countryOptions()} next={next}/></FocusBar>;
}
