import { EntityWidget } from '../shared/EntityWidget';
import { defineWidget } from '../types';
import { alarmSchema } from './schema';

export default defineWidget({
  schema: alarmSchema,
  Component: EntityWidget,
});
