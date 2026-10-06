/**
 * The status chips Widget (#53): `ui/ChipRow`'s job, laid out by its box and
 * coloured through the theme's custom properties.
 *
 * The Fault chip is the only one in the `alert` tone, so it stays
 * unmissable from across the room while staying a pill rather than turning
 * the whole Page red. Every other chip is neutral, whatever it says.
 *
 * A Concern chip opens its Concern list; the alarm chip opens @hakit's
 * entity dialog for the alarm. The list is this Widget's own state, never a
 * Popup's: only the device that was tapped shows it. It follows the live
 * Concern while open and closes for good once it clears; leaving the Page
 * unmounts this Widget, which closes it too.
 */
import { useState } from 'react';
import { cameraMoving, useEntities } from '../../ha';
import { concernAt, type ConcernLevel } from '../../ha/verdict';
import { useConcerns } from '../../renderer/concerns';
import { AlarmModal } from '../../ui/AlarmModal';
import { Icon } from '../../ui/Icon';
import { pressable } from '../../ui/pressable';
import type { WidgetProps } from '../types';
import { statusChips, type StatusChip } from './chips';
import { ConcernList } from './ConcernList';
import type { statusChipsSchema } from './schema';

export function StatusChipsWidget({ settings }: WidgetProps<(typeof statusChipsSchema)['settings']>) {
  const concerns = useConcerns();
  const entities = useEntities();
  const [openLevel, setOpenLevel] = useState<ConcernLevel | null>(null);
  const [alarmOpen, setAlarmOpen] = useState(false);

  const cameras = settings.cameras.flatMap(id => entities.get(id) ?? []);
  const moving = cameras.filter(c => cameraMoving(c, entities.values()));
  const alarm = (settings.alarm && entities.get(settings.alarm)) || null;
  const chips = statusChips({ concerns, cameras, moving, alarm });

  // Set during render, React's way to adjust state to a changed prop: the
  // list closes once its Concern clears, and does not come back by itself.
  const concern = openLevel === null ? null : concernAt(concerns, openLevel);
  if (openLevel !== null && concern === null) setOpenLevel(null);

  const onPress = (chip: StatusChip): (() => void) | undefined => {
    const opens = chip.opens;
    if (opens?.kind === 'concern') return () => setOpenLevel(opens.level);
    if (opens?.kind === 'alarm') return () => setAlarmOpen(true);
    return undefined;
  };

  return (
    <div className='ohm-status_chips'>
      {chips.map(chip => {
        const press = pressable(onPress(chip));
        return (
          <div key={chip.key} {...press} className='ohm-status_chips-chip' data-tone={chip.tone}>
            <Icon name={chip.icon} size={22} />
            <span className='ohm-status_chips-text'>{chip.text}</span>
          </div>
        );
      })}
      {concern && <ConcernList concern={concern} onClose={() => setOpenLevel(null)} />}
      {alarm && <AlarmModal alarm={alarm} open={alarmOpen} onClose={() => setAlarmOpen(false)} />}
    </div>
  );
}
