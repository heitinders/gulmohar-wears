export type Look = { slug:string; name:string; tone:string; number:string; description:string; images:{id:string;alt:string;caption:string}[]; features:string[]; film?:boolean };
export const looks:Look[]=[
 {slug:'olive-gold-suit',name:'Olive-gold embroidered suit',tone:'Olive gold',number:'01',description:'An olive-gold suit with embroidery across the front and sleeves, paired with wide trousers. The sheer dupatta has fine stripes; the close-ups show the neckline and hem in more detail.',images:[
  {id:'dsc07053',alt:'Full-length olive-gold suit with wide trousers and a sheer dupatta, beside a wooden chair',caption:'The full silhouette'},
  {id:'dsc07041',alt:'Olive-gold suit seated with the sheer dupatta draped over one shoulder',caption:'The drape, seated'},
  {id:'dsc07046',alt:'Close view of the olive-gold neckline, sleeves and embroidered pattern',caption:'Neckline and sleeve detail'},
  {id:'dsc07089',alt:'Close view of the olive-gold embroidered front and cuffs',caption:'Front and cuff detail'}],features:['Olive-gold colour','Round neckline','Embroidered front and sleeves','Sheer dupatta with parallel stripes'],film:true},
 {slug:'fuchsia-suit',name:'Fuchsia embroidered suit',tone:'Fuchsia',number:'02',description:'This fuchsia suit has a decorated neckline and small scattered motifs. A broad embroidered border runs along the dupatta, with detailed edging on the wide-legged trousers.',images:[
  {id:'dsc06967',alt:'Full-length fuchsia suit outdoors with a long bordered dupatta and wide-legged trousers',caption:'The full silhouette'},
  {id:'dsc06963',alt:'Fuchsia suit seated on garden steps, showing the dupatta drape',caption:'The drape, seated'},
  {id:'dsc06973',alt:'Fuchsia suit neckline and sleeve with pale metallic-looking embroidery',caption:'Neckline and cuff detail'},
  {id:'dsc06962',alt:'Close view of the fuchsia dupatta border and embroidered trouser hem',caption:'The border and hem'}],features:['Fuchsia colour','Decorated neckline and cuffs','Scattered motifs','Wide, patterned dupatta border']},
 {slug:'blue-suit',name:'Blue embroidered suit',tone:'Soft blue',number:'03',description:'Long embroidered panels run down the front of this blue suit. The sleeves and trouser hems have matching detail. See the seated view for a closer look at the blue dupatta.',images:[
  {id:'dsc07025',alt:'Full-length blue embroidered suit with matching trousers and dupatta beside a staircase',caption:'The full silhouette'},
  {id:'dsc07018',alt:'Blue suit seated on stairs with the dupatta spread alongside',caption:'The drape, seated'},
  {id:'dsc07024',alt:'Close view of the blue embroidered front, sleeve and trouser details',caption:'The embroidery in detail'}],features:['Blue colour','Long embroidered front panels','Detailed sleeves and trouser hems','Matching dupatta']}
];
export const findLook=(slug:string)=>looks.find(look=>look.slug===slug);
export const lookMessage=(look:Look)=>`Hi Gulmohar, I would like to enquire about the ${look.name} shown on your website. Please confirm the fabric, available options, price, measurements and delivery timeline.`;
