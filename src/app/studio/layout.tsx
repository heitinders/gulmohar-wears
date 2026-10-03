import type {Metadata} from 'next';
import './studio.css';
export const metadata: Metadata = {title: {default: 'Studio', template: '%s | Gulmohar Studio'}, robots: {index: false, follow: false}};
/** Staff only. Client names and phones appear here, so session recording masks the whole studio. */
export default function StudioLayout({children}: {children: React.ReactNode}) {
  return <div className="studio-shell" data-clarity-mask="true">{children}</div>;
}
