'use client';
import {useEffect, useRef} from 'react';

/** Moves focus for keyboard and screen reader users. A heading gets tabindex -1 so it can hold focus. */
export function focusTarget(el: Element | null) {
  if (!(el instanceof HTMLElement)) return;
  if (!el.hasAttribute('tabindex') && !el.matches('a[href],button,input,select,textarea')) el.tabIndex = -1;
  el.focus();
}

/** Focuses the first match for selector when key changes. The first settled key (null waits) is a page load and leaves focus alone. */
export function useFocusOnChange(key: string | null, selector: string) {
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (key === null) return;
    if (prev.current !== null && prev.current !== key) focusTarget(document.querySelector(selector));
    prev.current = key;
  }, [key, selector]);
}
