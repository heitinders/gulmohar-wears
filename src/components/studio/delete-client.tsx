'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {deleteClientAction} from '@/app/studio/actions';

export function DeleteClient({id, name}: {id: string; name: string}) {
  const router = useRouter(); const [failed, setFailed] = useState(false);
  async function remove() {
    if (!confirm(`Delete ${name} from the studio list? Measures saved on this device stay until you remove them.`)) return;
    const r = await deleteClientAction(id).catch(() => ({ok: false}));
    if (r.ok) router.refresh(); else setFailed(true);
  }
  return <>{failed && <span className="fit-error" role="alert">Couldn&apos;t delete. Try again.</span>}<button type="button" className="text-link" aria-label={`Delete ${name}`} onClick={remove}>Delete</button></>;
}
