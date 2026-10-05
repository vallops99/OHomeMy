import { useEffect, useState } from 'react';

/**
 * Is this element scrolled short of its end? Drives the fade that admits
 * there is more below (ADR-0007): `Panel`'s `left`, and a Room Grid past
 * eight Areas (#42).
 *
 * A `ResizeObserver` rather than a one-off measurement, because what makes
 * `left` overflow is a house adding a card -- a change in content,
 * not in viewport -- and a one-off read at mount would miss it. It observes
 * the scroller *and* its children, since the overflow condition changes when a
 * child resizes even though the scroller itself does not.
 */
export function useHasMoreBelow(ref: React.RefObject<HTMLDivElement | null>): boolean {
  const [more, setMore] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el === null) return;

    const measure = () => {
      // A 1 px tolerance: sub-pixel layout routinely leaves scrollHeight a
      // fraction above clientHeight on an element that visually fits, and a
      // fade over nothing is the same lie in the other direction.
      const hidden = el.scrollHeight - el.clientHeight - el.scrollTop;
      setMore(hidden > 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    el.addEventListener('scroll', measure, { passive: true });

    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', measure);
    };
  });

  return more;
}
