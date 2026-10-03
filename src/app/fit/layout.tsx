import type {Metadata} from 'next';
import './fit.css';
export const metadata:Metadata={title:'Find your fit',description:'Draft Punjabi suit measurements from two photos and your height, checked by our tailor before cutting.'};
export default function FitLayout({children}:{children:React.ReactNode}){return children;}
