import { EntityWidget } from '../shared/EntityWidget';
import { defineWidget } from '../types';
import { sensorSchema } from './schema';

export default defineWidget({
  schema: sensorSchema,
  Component: EntityWidget,
});
