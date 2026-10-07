/**
 * A gate, Casa Panel's `AccessRow` (#43): an icon well, the name, a status
 * line, and one action -- Apri, held for 700 ms, while it is closed, and
 * Chiudi, a single tap, while it is open.
 *
 * Every `lock` is one, in a Group's card or alone in its own (`Card`): a gate
 * opened by a stray tap is a gate open onto the street, so the hold is
 * where the safety is (docs/protocol.md). The hold's rules are
 * `accessHold.ts`; this file binds them to the pointer and to timers.
 *
 * Not a `Tile`: the row is not pressable, only its button is, and @hakit's
 * long-press modal would offer an unlock with no hold at all.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { useActions, type Entity } from '../ha';
import { tr } from '../i18n';
import { accessStatus, HOLD_MS, holdStep, holdTimeout, IDLE, isOpenLock, type Hold, type HoldEvent } from './accessHold';
import { entityIcon, Icon } from './Icon';
import { stateLabel } from './stateLabel';
import { v } from './vars';

export type AccessRowProps = { entity: Entity };

export function AccessRow({ entity }: AccessRowProps) {
  const actions = useActions();
  // The machine's state lives in a ref as well as in state: a step that
  // opens must call Home Assistant exactly once, which a side effect inside
  // a state updater cannot promise.
  const holdRef = useRef<Hold>(IDLE);
  const [hold, setHold] = useState<Hold>(IDLE);
  // The gate as last rendered, for a hold that completes on a timer. Read
  // through a ref so that a state update arriving mid-hold does not re-arm
  // the timer and restart the 700 ms.
  const entityRef = useRef(entity);
  useEffect(() => {
    entityRef.current = entity;
  });
  const send = useCallback(
    (event: HoldEvent) => {
      const step = holdStep(holdRef.current, event);
      holdRef.current = step.hold;
      setHold(step.hold);
      if (step.opens) actions.unlock(entityRef.current);
    },
    [actions]
  );

  // The hold's end and the hint's end are each one timer, armed for the
  // state that wants it. A timer that fires has, by definition, waited its
  // time: the tick is dated no earlier than that, so a timer a millisecond
  // early cannot strand the hold half-way.
  useEffect(() => {
    const wait = holdTimeout(hold);
    if (wait === null || hold.phase === 'idle') return;
    const due = hold.since + wait;
    const timer = setTimeout(() => send({ type: 'tick', at: Math.max(Date.now(), due) }), wait);
    return () => clearTimeout(timer);
  }, [hold, send]);

  const open = isOpenLock(entity.state);
  const unavailable = entity.unavailable;
  const status = accessStatus(entity, hold, stateLabel(entity));
  const statusColor = status.tone === 'alert' ? v.color.alert : status.tone === 'accent' ? v.color.accent : v.color.inkMuted;

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    send({ type: 'press', at: Date.now() });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBlock: 10, paddingInline: '10px 6px', minWidth: 0 }}>
      <div
        style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: v.radius.well,
          background: unavailable ? v.color.alertSurface : v.color.surfaceWell,
          color: unavailable ? v.color.alert : v.color.ink,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={unavailable ? 'mdi:alert-circle' : entityIcon(entity)} size={24} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          dir='auto'
          title={entity.name}
          style={{
            fontSize: v.type.rowTitle.size,
            lineHeight: v.type.rowTitle.lineHeight,
            fontWeight: v.type.rowTitle.weight,
            color: v.color.ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {entity.name}
        </span>
        {/* `aria-live`: the hint and `Apertura…` are the answer to a press. */}
        <span
          aria-live='polite'
          style={{
            fontSize: v.type.meta.size,
            lineHeight: v.type.meta.lineHeight,
            color: statusColor,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: v.radius.pill, background: 'currentColor', flexShrink: 0 }} />
          {status.label}
        </span>
      </div>
      {open ? (
        <button
          type='button'
          className='casa-press'
          disabled={unavailable}
          aria-label={tr('access.closeLabel', { name: entity.name })}
          onClick={() => actions.lock(entity)}
          style={{ ...pill, background: v.color.switchOff, color: v.color.ink }}
        >
          {tr('access.closeButton')}
        </button>
      ) : (
        <button
          type='button'
          className='casa-press'
          disabled={unavailable}
          aria-label={tr('access.openLabel', { name: entity.name })}
          onPointerDown={onPointerDown}
          onPointerUp={() => send({ type: 'release', at: Date.now() })}
          onPointerLeave={() => send({ type: 'cancel' })}
          onPointerCancel={() => send({ type: 'cancel' })}
          // The long-press menu would otherwise open over the held button.
          onContextMenu={e => e.preventDefault()}
          // A click with no pointer behind it (`detail` 0) is Enter or Space:
          // a keyboard has no hold to give, so it opens at once.
          onClick={e => {
            if (e.detail === 0) send({ type: 'key' });
          }}
          style={{ ...pill, background: v.color.primary, color: v.color.onPrimary }}
        >
          {/* The sweep: `accent-soft` filling the button over the hold. */}
          <span
            style={{
              position: 'absolute',
              insetInlineStart: 0,
              top: 0,
              bottom: 0,
              width: hold.phase === 'holding' ? '100%' : '0%',
              background: v.color.accentSoft,
              transition: hold.phase === 'holding' ? `width ${HOLD_MS}ms linear` : 'width 150ms ease',
            }}
          />
          <span style={{ position: 'relative' }}>{tr('access.openButton')}</span>
        </button>
      )}
    </div>
  );
}

/** Casa Panel's large pill button: `target-control` tall, one verb. */
const pill: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  flexShrink: 0,
  height: v.size.targetControl,
  minWidth: 108,
  padding: '0 22px',
  border: 'none',
  borderRadius: v.radius.pill,
  fontFamily: 'inherit',
  fontSize: v.type.bodyLg.size,
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  // A hold must not be read as a scroll, a selection or a double-tap zoom.
  touchAction: 'manipulation',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
};
