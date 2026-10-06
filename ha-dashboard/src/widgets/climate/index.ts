import { EntityWidget } from '../shared/EntityWidget';
import { defineWidget } from '../types';
import { climateSchema } from './schema';

export default defineWidget({
  schema: climateSchema,
  Component: EntityWidget,
});
