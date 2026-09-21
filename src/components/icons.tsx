export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{diagonal ? <path d="M6 18 18 6M6 6h12v12" /> : <path d="M4 12h15m-6-6 6 6-6 6" />}</svg>;
}

export function MessageIcon() {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.7-4.7A8.5 8.5 0 1 1 20 11.5Z" /><path d="M8 7.5c0 4 2.5 6.5 6.5 7l1-2-2-1-.8 1c-1.5-.5-2.3-1.3-2.8-2.8l1-.7-1-2-1.9.5Z" /></svg>;
}

export function InstagramIcon() {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>;
}
