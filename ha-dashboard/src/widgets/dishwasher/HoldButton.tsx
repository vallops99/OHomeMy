/**
 * A button that acts only after the gates' hold (#81, `ui/accessHold.ts`):
 * Stop interrupts a wash, which cannot be undone, so a stray tap must not.
 * The hold's rules are `holdStep`; this binds them to the pointer and to
 * timers as `ui/AccessRow.tsx` does for Apri, with the same sweep and hint.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { tr } from '../../i18n';
import { HOLD_MS, holdStep, holdTimeout, IDLE, type Hold, type HoldEvent } from '../../ui/accessHold';

export type HoldButtonProps = {
  label: string;
  icon: ReactNode;
  onAct: () => void;
};

export function HoldButton({ label, icon, onAct }: HoldButtonProps) {
  // The machine lives in a ref as well as in state, so that a step that acts
  // calls Home Assistant exactly once.
  const holdRef = useRef<Hold>(IDLE);
  const [hold, setHold] = useState<Hold>(IDLE);
  const actRef = useRef(onAct);
  useEffect(() => {
    actRef.current = onAct;
  });
  const send = useCallback((event: HoldEvent) => {
    const step = holdStep(holdRef.current, event);
    holdRef.current = step.hold;
    setHold(step.hold);
    if (step.opens) actRef.current();
  }, []);

  useEffect(() => {
    const wait = holdTimeout(hold);
    if (wait === null || hold.phase === 'idle') return;
    const due = hold.since + wait;
    const timer = setTimeout(() => send({ type: 'tick', at: Math.max(Date.now(), due) }), wait);
    return () => clearTimeout(timer);
  }, [hold, send]);

  return (
    <button
      type='button'
      className='ohm-dishwasher-button casa-press'
      data-hold={hold.phase}
      aria-label={label}
      onPointerDown={e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        send({ type: 'press', at: Date.now() });
      }}
      onPointerUp={() => send({ type: 'release', at: Date.now() })}
      onPointerLeave={() => send({ type: 'cancel' })}
      onPointerCancel={() => send({ type: 'cancel' })}
      onContextMenu={e => e.preventDefault()}
      // A click with no pointer behind it is Enter or Space: no hold to give.
      onClick={e => {
        if (e.detail === 0) send({ type: 'key' });
      }}
    >
      <span
        className='ohm-dishwasher-sweep'
        style={{
          width: hold.phase === 'holding' ? '100%' : '0%',
          transition: hold.phase === 'holding' ? `width ${HOLD_MS}ms linear` : 'width 150ms ease',
        }}
      />
      <span className='ohm-dishwasher-button-face' aria-live='polite'>
        {icon}
        {hold.phase === 'hint' ? tr('dishwasher.stopHold') : label}
      </span>
    </button>
  );
}
