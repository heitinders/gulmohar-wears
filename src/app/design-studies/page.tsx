import Image from "next/image";
import localFont from "next/font/local";
import styles from "./study.module.css";
const fashion = localFont({src: "../../../node_modules/@fontsource/bodoni-moda/files/bodoni-moda-latin-400-normal.woff2", display:"swap"});
const literary = localFont({src: "../../../node_modules/@fontsource/newsreader/files/newsreader-latin-400-normal.woff2", display:"swap"});
const text = localFont({src: "../../../node_modules/@fontsource/manrope/files/manrope-latin-400-normal.woff2", display:"swap"});

export default function Studies() {
  return <main id="main" className={`${styles.studies} ${text.className}`}>{[["fashion",fashion.className,"01 / Precise fashion"],["literary",literary.className,"02 / Literary warmth"]].map(([id,font,label])=><section id={id} className={`${styles.study} ${id==="fashion"?styles.fashion:styles.literary}`} key={id}>
    <div className={styles.copy}><p>{label}</p><span className={`${styles.brand} ${font}`}>Gulmohar Wears</span><h1 className={font}>Made for<br/>your occasion</h1><p>Bespoke Indian wear from Mohali.<br/>Made to order. Shipped worldwide.</p><span className={styles.action}>Enquire on WhatsApp ↗</span><p className={styles.caption}>Olive-gold embroidered suit<br/>DSC07053 · Client shoot, 18 September 2026</p></div>
    <Image src="/media/study-olive.webp" width={1600} height={2395} alt="Olive-gold suit with a sheer dupatta, standing full-length beside a chair" sizes="(max-width: 700px) 100vw, 50vw" preload />
  </section>)}<p className={styles.selection}>Selected: study 01. Bodoni Moda’s sharper contrast and measured uppercase give the full silhouette a fashion-editorial frame. Manrope keeps enquiries legible. Both fonts are self-hosted under the SIL Open Font License. The Latin site title is a provisional typographic treatment, not a replacement for the supplied Gurmukhi artwork.</p></main>;
}
