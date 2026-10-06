import { EntityWidget } from '../shared/EntityWidget';
import { defineWidget } from '../types';
import { binarySensorSchema } from './schema';

export default defineWidget({
  schema: binarySensorSchema,
  Component: EntityWidget,
});
