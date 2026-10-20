import { EntityWidget } from '../shared/EntityWidget';
import { defineWidget } from '../types';
import { vacuumSchema } from './schema';

export default defineWidget({
  schema: vacuumSchema,
  Component: EntityWidget,
  smallest: { full: { width: 484, height: 153 } },
});
