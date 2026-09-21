import type {Metadata} from 'next';
import localFont from 'next/font/local';
import {Navigation} from '@/components/navigation';
import {Footer} from '@/components/footer';
import {FloatingContacts} from '@/components/floating-contacts';
import './globals.css';
const display=localFont({src:[{path:'../../node_modules/@fontsource/bodoni-moda/files/bodoni-moda-latin-400-normal.woff2',weight:'400',style:'normal'},{path:'../../node_modules/@fontsource/bodoni-moda/files/bodoni-moda-latin-400-italic.woff2',weight:'400',style:'italic'}],variable:'--font-display',display:'swap'});
const body=localFont({src:[{path:'../../node_modules/@fontsource/manrope/files/manrope-latin-400-normal.woff2',weight:'400'},{path:'../../node_modules/@fontsource/manrope/files/manrope-latin-500-normal.woff2',weight:'500'}],variable:'--font-body',display:'swap',preload:false});
export const metadata:Metadata={title:{default:'Gulmohar Wears | Bespoke Indian Wear, Mohali',template:'%s | Gulmohar Wears'},description:'Bespoke suits, lehengas and wedding wear from Mohali, Punjab. Made to order, shipped worldwide.',robots:{index:false,follow:false},icons:{icon:'/brand/gulmohar-original.jpeg'}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en" className={`${display.variable} ${body.variable}`}><body><Navigation/>{children}<Footer/><FloatingContacts/></body></html>;}
