'use client';
/* eslint-disable @next/next/no-img-element -- The preview is a local object URL that never leaves the device. */
import {useEffect, useRef, useState} from 'react';
import {Arrow} from '../icons';

type Facing = 'environment' | 'user';
const FRAMING: Record<'front' | 'side', string[]> = {
  front: ['Face the camera, arms a little away from your body.', 'Whole body in frame, head to feet.', 'Fitted clothes, plain wall, even light.'],
  side: ['Turn fully to one side.', 'Same distance from the camera as the front photo.', 'Arms relaxed by your sides.'],
};

/** Live preview with an outline guide, capture to JPEG, upload fallback. Streams stop on unmount. */
export function CameraCapture({shot, onCapture}: {shot: 'front' | 'side'; onCapture(blob: Blob): void}) {
  const video = useRef<HTMLVideoElement>(null); const file = useRef<HTMLInputElement>(null);
  const [facing, setFacing] = useState<Facing>('environment');
  const [camera, setCamera] = useState<'starting' | 'live' | 'unavailable'>('starting');
  const [preview, setPreview] = useState<{url: string; blob: Blob} | null>(null);

  useEffect(() => {
    let stream: MediaStream | undefined; let cancelled = false;
    if (preview) return;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera api');
        stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: {ideal: facing}, width: {ideal: 1280}, height: {ideal: 1920}}, audio: false});
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        if (video.current) { video.current.srcObject = stream; await video.current.play(); }
        setCamera('live');
      } catch { setCamera('unavailable'); }
    })();
    return () => { cancelled = true; stream?.getTracks().forEach(t => t.stop()); };
  }, [facing, preview]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  // Front camera frames are mirrored on capture, ported from app.js (L2831).
  function capture() {
    const v = video.current; if (!v || !v.videoWidth) return;
    const canvas = document.createElement('canvas'); canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d')!;
    if (facing === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0);
    canvas.toBlob(blob => { if (blob) setPreview({url: URL.createObjectURL(blob), blob}); }, 'image/jpeg', 0.92);
  }
  function chooseFile(f: File | undefined) { if (f) setPreview({url: URL.createObjectURL(f), blob: f}); }

  return <section className="capture" aria-label={`${shot === 'front' ? 'Front' : 'Side'} photo`}>
    <div className="capture-stage">
      {preview ? <img src={preview.url} alt={`Your ${shot} photo, ready to check`}/> : <video ref={video} playsInline muted aria-label="Camera preview"/>}
      {!preview && camera === 'live' && <svg className="capture-guide" viewBox="0 0 90 160" preserveAspectRatio="xMidYMid meet" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 3"><circle cx="45" cy="18" r="9"/><path d="M22 40h46M45 40v70M18 150h54"/></svg>}
      {!preview && camera === 'unavailable' && <div className="capture-tips capture-unavailable"><strong>Camera not available.</strong> Upload a photo from your gallery instead.</div>}
    </div>
    <div className="capture-tips">{preview ? <strong>Whole body in frame, feet showing, arms away from the body?</strong> : FRAMING[shot].map(t => <span key={t}>{t}</span>)}</div>
    <div className="capture-actions">
      {preview ? <>
        <button type="button" className="button button-outline" onClick={() => setPreview(null)}>Retake</button>
        <button type="button" className="button button-primary" onClick={() => onCapture(preview.blob)}>Use this photo <Arrow/></button>
      </> : <>
        <button type="button" className="button button-outline" onClick={() => file.current?.click()}>Upload instead</button>
        <button type="button" className="button button-primary" onClick={capture} disabled={camera !== 'live'}>Take photo</button>
        {camera === 'live' && <button type="button" className="text-link capture-switch" onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')}>Switch camera</button>}
      </>}
      <input ref={file} className="capture-file" type="file" accept="image/*" aria-label="Upload a photo" onChange={e => chooseFile(e.target.files?.[0])}/>
    </div>
  </section>;
}
