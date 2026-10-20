import { EntityWidget } from '../shared/EntityWidget';
import { defineWidget } from '../types';
import { sensorSchema } from './schema';

export default defineWidget({
  schema: sensorSchema,
  Component: EntityWidget,
  smallest: { full: { width: 147, height: 35 }, compact: { width: 151, height: 63 } },
});
