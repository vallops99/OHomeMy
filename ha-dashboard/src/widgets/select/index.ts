import { EntityWidget } from '../shared/EntityWidget';
import { defineWidget } from '../types';
import { selectSchema } from './schema';

export default defineWidget({
  schema: selectSchema,
  Component: EntityWidget,
});
