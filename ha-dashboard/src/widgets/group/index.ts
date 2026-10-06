import { defineWidget } from '../types';
import { GroupWidget } from './GroupWidget';
import { groupSchema } from './schema';

export default defineWidget({
  schema: groupSchema,
  Component: GroupWidget,
});
