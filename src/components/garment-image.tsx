import type {CSSProperties} from 'react';
/** Responsive files are exported directly from supplied RAW originals. */
export function GarmentImage({id,alt,sizes='(max-width: 767px) 100vw, 50vw',eager=false,className='',position}:{id:string;alt:string;sizes?:string;eager?:boolean;className?:string;position?:string}){
 const srcset=(format:string)=>[320,480,640,800,1080,1600,2400].map(w=>`/media/${id}-${w}.${format} ${w}w`).join(', ');
 return <picture className={`garment-picture ${className}`} style={position?{'--focal':position} as CSSProperties:undefined}><source type="image/avif" srcSet={srcset('avif')} sizes={sizes}/><source type="image/webp" srcSet={srcset('webp')} sizes={sizes}/>{/* Already optimized at export, avoids a second lossy encoding. */}<img src={`/media/${id}-1600.jpg`} width={4024} height={6024} alt={alt} loading={eager?'eager':'lazy'} fetchPriority={eager?'high':'auto'} decoding={eager?'sync':'async'}/></picture>;
}
