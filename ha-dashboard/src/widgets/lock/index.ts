import { EntityWidget } from '../shared/EntityWidget';
import { defineWidget } from '../types';
import { lockSchema } from './schema';

export default defineWidget({
  schema: lockSchema,
  Component: EntityWidget,
  smallest: { full: { width: 225, height: 97 } },
});
