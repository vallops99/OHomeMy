import { EntityWidget } from '../shared/EntityWidget';
import { defineWidget } from '../types';
import { binarySensorSchema } from './schema';

export default defineWidget({
  schema: binarySensorSchema,
  Component: EntityWidget,
  smallest: { full: { width: 149, height: 35 }, compact: { width: 158, height: 63 } },
});
