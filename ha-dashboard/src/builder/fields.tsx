/**
 * The Dashboard screen's inputs (#56): a labelled row around one control, a number
 * that is only ever committed when valid, a switch, a picker, and an
 * ordered list. Each offers only valid values and hands the Dashboard screen a value,
 * never an event, so the rules stay in `pages.ts`, `layout.ts` and
 * `inspector.ts`.
 */
import { useId, useState, type ReactNode } from 'react';
import { tr } from '../i18n';
import { Icon } from '../ui/Icon';
import type { Option } from './inspector';

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className='b-field'>
      <label className='b-label' htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {hint && <span className='b-meta'>{hint}</span>}
    </div>
  );
}

/**
 * A number between `min` and `max`. What is typed is kept as typed, and
 * committed only once it is a valid value; leaving the field puts back the
 * value in force, so an invalid number never reaches the Draft.
 */
export function NumberInput({
  id,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled,
  name,
}: {
  id?: string;
  value: number;
  min: number;
  max?: number;
  step?: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  name?: string;
}) {
  // What is typed, for the value it was typed over: once the value changes
  // (committed, or by another control) the field shows the value again.
  const [typed, setTyped] = useState<{ text: string; over: number } | null>(null);
  const text = typed && typed.over === value ? typed.text : String(value);
  const valid = (n: number) => Number.isFinite(n) && n >= min && (max === undefined || n <= max) && (step !== 1 || Number.isInteger(n));
  return (
    <input
      className='b-input b-number'
      id={id}
      name={name}
      type='number'
      inputMode={step === 1 ? 'numeric' : 'decimal'}
      min={min}
      max={max}
      step={step}
      value={text}
      disabled={disabled}
      aria-invalid={!valid(Number(text))}
      onChange={e => {
        setTyped({ text: e.target.value, over: value });
        const n = Number(e.target.value);
        if (e.target.value !== '' && valid(n) && n !== value) onChange(n);
      }}
      onBlur={() => setTyped(null)}
    />
  );
}

export function Switch({
  id,
  checked,
  onChange,
  label,
  disabled,
}: {
  id?: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className='b-switch'>
      <input id={id} type='checkbox' role='switch' checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/**
 * A picker of `options`. `placeholder` is shown while nothing is chosen and
 * cannot be chosen back; `none`, when given, is a real choice of nothing.
 */
export function Picker({
  id,
  value,
  options,
  onChange,
  none,
  placeholder,
  disabled,
  name,
}: {
  id?: string;
  value: string | null;
  options: readonly Option[];
  onChange: (value: string | null) => void;
  none?: string;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <select
      className='b-input b-select'
      id={id}
      name={name}
      value={value ?? ''}
      disabled={disabled}
      onChange={e => onChange(e.target.value === '' ? null : e.target.value)}
    >
      {value === null && none === undefined && (
        <option value='' disabled>
          {placeholder ?? tr('builder.dashboard.field.choose')}
        </option>
      )}
      {none !== undefined && <option value=''>{none}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {optionText(o)}
        </option>
      ))}
    </select>
  );
}

const optionText = (o: Option) =>
  o.missing ? tr('builder.dashboard.field.missing', { id: o.value }) : o.detail ? `${o.label} — ${o.detail}` : o.label;

/** A picker of icons, with the chosen one drawn beside it. */
export function IconPicker(props: Parameters<typeof Picker>[0]) {
  return (
    <div className='b-icon-picker'>
      <span className='b-icon-shown' aria-hidden>
        {props.value && <Icon name={props.value} size={22} />}
      </span>
      <Picker {...props} />
    </div>
  );
}

/**
 * An ordered list of chosen items, each moved or removed in place, and a
 * picker that adds one of what is left at the end.
 */
export function OrderedList({
  id,
  chosen,
  options,
  min,
  onChange,
}: {
  id?: string;
  chosen: readonly Option[];
  options: readonly Option[];
  min: number;
  onChange: (values: string[]) => void;
}) {
  const values = chosen.map(o => o.value);
  const swap = (i: number, j: number) => {
    const next = [...values];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className='b-ordered'>
      {chosen.length > 0 && (
        <ol className='b-ordered-list'>
          {chosen.map((o, i) => (
            <li key={o.value} className='b-ordered-item' data-missing={!!o.missing}>
              <span className='b-ordered-text'>
                <span>{o.missing ? tr('builder.dashboard.field.missing', { id: o.value }) : o.label}</span>
                {o.detail && !o.missing && <span className='b-meta'>{o.detail}</span>}
              </span>
              <span className='b-actions'>
                <button
                  type='button'
                  className='b-button b-icon'
                  aria-label={tr('builder.dashboard.field.up')}
                  disabled={i === 0}
                  onClick={() => swap(i, i - 1)}
                >
                  ↑
                </button>
                <button
                  type='button'
                  className='b-button b-icon'
                  aria-label={tr('builder.dashboard.field.down')}
                  disabled={i === chosen.length - 1}
                  onClick={() => swap(i, i + 1)}
                >
                  ↓
                </button>
                <button
                  type='button'
                  className='b-button b-icon'
                  aria-label={`${tr('builder.dashboard.field.remove')} ${o.label}`}
                  onClick={() => onChange(values.filter(v => v !== o.value))}
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
      {chosen.length < min && <span className='b-error'>{tr('builder.dashboard.field.atLeast', { count: min })}</span>}
      {options.length > 0 && (
        <Picker
          id={id}
          value={null}
          options={options}
          placeholder={tr('builder.dashboard.field.add')}
          onChange={v => v && onChange([...values, v])}
        />
      )}
    </div>
  );
}
