import Image from 'next/image';

/** Header windows arrange the supplied flowers and lettering horizontally. */
export function BrandMark({eager = false, compact = false}: {eager?: boolean; compact?: boolean}) {
  if (compact) return <span className="brand-lockup" role="img" aria-label="Gulmohar Wears">
    <span className="brand-flower" aria-hidden="true"><Image src="/brand/gulmohar-original.jpeg" alt="" width={1254} height={1254} sizes="110px" loading={eager ? 'eager' : 'lazy'}/></span>
    <span className="brand-lettering" aria-hidden="true"><Image src="/brand/gulmohar-original.jpeg" alt="" width={1254} height={1254} sizes="220px" loading={eager ? 'eager' : 'lazy'}/></span>
  </span>;
  return <span className="brand-mark"><Image src="/brand/gulmohar-original.jpeg" alt="Gulmohar Wears, tradition in every thread" width={1254} height={1254} sizes="201px" loading={eager ? 'eager' : 'lazy'}/></span>;
}
