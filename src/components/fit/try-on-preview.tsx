/** The preview with its label attached to the image itself, so a screenshot cannot lose it (spec 5). */
export function TryOnPreview({src, lookName}: {src: string; lookName: string}) {
  return <figure className="tryon-preview">
    {/* eslint-disable-next-line @next/next/no-img-element -- a blob URL made on this phone, not an optimisable asset */}
    <img src={src} alt={`AI preview of you wearing the ${lookName}`}/>
    <figcaption className="tryon-label">AI preview, not a photograph of the garment</figcaption>
  </figure>;
}
