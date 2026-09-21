'use client';
/* eslint-disable @next/next/no-img-element -- Frame-matched, precompressed local video posters. */
import {useEffect, useRef, useState} from 'react';

type Connection = EventTarget & {saveData?: boolean; effectiveType?: string};
type Props = {id: 'olive-hero' | 'fuchsia-walk' | 'olive-drape'; label: string; description: string; eager?: boolean; className?: string};

export function EditorialFilm({id, label, description, eager = false, className = ''}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const toggle = useRef<() => void>(() => {});
  const [playing, setPlaying] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    container.current!.dataset.enhanced = 'true';
    const element = video.current!;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & {connection?: Connection}).connection;
    let visible = false;
    let loaded = document.readyState === 'complete';
    let intent: boolean | null = null;
    let blocked = false;
    let disposed = false;
    const automaticAllowed = () => !motion.matches && !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType ?? '');
    const play = () => {
      if (!element.getAttribute('src')) {
        const small = window.matchMedia('(max-width: 767px)').matches || (container.current?.clientWidth ?? 720) <= 320;
        element.src = `/media/${id}-${small ? 480 : 720}.mp4`;
      }
      element.muted = true;
      void element.play().catch(error => {
        if (!disposed && error.name !== 'AbortError') blocked = true;
      });
    };
    const sync = () => {
      if (!visible || document.hidden || intent === false || (!automaticAllowed() && intent !== true)) {
        element.pause();
      } else if (loaded && !blocked) play();
    };
    toggle.current = () => {
      if (!element.paused) { intent = false; element.pause(); }
      else { intent = true; blocked = false; play(); }
    };
    const onLoad = () => { loaded = true; sync(); };
    // A new accessibility/data preference takes precedence over an earlier play choice.
    const onPreference = () => { intent = null; sync(); };
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.2;
      sync();
    }, {threshold: [0, 0.2]});
    observer.observe(container.current!);
    window.addEventListener('load', onLoad);
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', onPreference);
    connection?.addEventListener('change', onPreference);
    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('load', onLoad);
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', onPreference);
      connection?.removeEventListener('change', onPreference);
      element.pause();
    };
  }, [id]);

  return <div ref={container} className={`editorial-film ${className}`} data-film={id}>
    <img src={`/media/${id}-poster.webp`} alt={description} width={720} height={1280}
      loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding={eager ? 'sync' : 'async'}/>
    <video ref={video} muted loop playsInline preload="none" width={720} height={1280}
      aria-hidden="true" className={hasFrame && !failed ? 'has-frame' : ''}
      onPlaying={() => {setPlaying(true); setHasFrame(true);}}
      onPause={() => setPlaying(false)} onError={() => {setFailed(true); setPlaying(false);}}/>
    {!failed ? <button type="button" className="film-control" onClick={() => toggle.current()}
      aria-label={`${playing ? 'Pause' : 'Play'} ${label}`}>
      <svg viewBox="0 0 20 20" aria-hidden="true">{playing
        ? <path d="M6 4v12M14 4v12" fill="none" stroke="currentColor" strokeWidth="2"/>
        : <path d="m6 3 11 7-11 7Z" fill="currentColor"/>}</svg>
      <span>{playing ? 'Pause film' : 'Play film'}</span>
    </button> : <span className="film-unavailable" role="status">Film unavailable. Showing a still.</span>}
  </div>;
}
