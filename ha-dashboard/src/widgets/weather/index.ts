import { EntityWidget } from '../shared/EntityWidget';
import { defineWidget } from '../types';
import { weatherSchema } from './schema';

export default defineWidget({
  schema: weatherSchema,
  Component: EntityWidget,
  smallest: { full: { width: 373, height: 208 }, compact: { width: 246, height: 65 } },
});
