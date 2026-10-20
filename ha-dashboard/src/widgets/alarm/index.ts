import { EntityWidget } from '../shared/EntityWidget';
import { defineWidget } from '../types';
import { alarmSchema } from './schema';

export default defineWidget({
  schema: alarmSchema,
  Component: EntityWidget,
  smallest: { full: { width: 231, height: 123 }, compact: { width: 108, height: 150 } },
});
