import { EntityWidget } from '../shared/EntityWidget';
import { defineWidget } from '../types';
import { weatherSchema } from './schema';

export default defineWidget({
  schema: weatherSchema,
  Component: EntityWidget,
});
