import { EntityWidget } from '../shared/EntityWidget';
import { defineWidget } from '../types';
import { climateSchema } from './schema';

export default defineWidget({
  schema: climateSchema,
  Component: EntityWidget,
  smallest: { full: { width: 256, height: 190 }, compact: { width: 165, height: 63 } },
});
