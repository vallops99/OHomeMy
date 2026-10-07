/**
 * Export what is published as a JSON file, and import one in its place. An
 * import is a Publish (the server migrates an older export first), so it
 * goes through the same conflict check, and history can undo it.
 */
import { useRef, useState } from 'react';
import type { DocumentAdmin } from '../ha';
import { tr } from '../i18n';
import type { Ask } from './Builder';
import { messageOf } from './messageOf';
import { canReplace, type Session } from './session';
import { discards } from './words';

export function TransferSection({
  admin,
  session,
  dirty,
  ask,
  importData,
}: {
  admin: DocumentAdmin;
  session: Session;
  dirty: boolean;
  ask: Ask;
  importData: (data: unknown) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setError(null);
    try {
      const exported = await admin.export();
      const url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `ohomemy-revision-${exported.revision}.json` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      setError(tr('builder.transfer.exportFailed', { message: messageOf(err) }));
    }
  };

  const chosen = async (file: File) => {
    setError(null);
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setError(tr('builder.transfer.notJson', { file: file.name }));
      return;
    }
    ask({
      message: tr('builder.transfer.importConfirm', { file: file.name }) + discards(dirty),
      confirmLabel: tr('builder.transfer.import'),
      onConfirm: () => importData(data),
    });
  };

  return (
    <section className='b-section' aria-labelledby='b-transfer'>
      <div className='b-section-head'>
        <h2 id='b-transfer'>{tr('builder.transfer.title')}</h2>
        <div className='b-actions'>
          <button className='b-button' onClick={download}>
            {tr('builder.transfer.export')}
          </button>
          <button className='b-button' disabled={!canReplace(session)} onClick={() => input.current?.click()}>
            {tr('builder.transfer.import')}
          </button>
        </div>
      </div>
      <p className='b-meta'>{tr('builder.transfer.body')}</p>
      {error && <p className='b-error'>{error}</p>}
      <input
        ref={input}
        type='file'
        accept='application/json,.json'
        hidden
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) chosen(file);
        }}
      />
    </section>
  );
}
