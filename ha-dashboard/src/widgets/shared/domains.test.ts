/**
 * The per-Domain kinds and the Group (#52): which entities each takes, read
 * through their schemas as the renderer and the Builder read them.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateWidget, type WidgetSchema } from '../../document/schema';
import type { Widget } from '../../document/types';
import { alarmSchema } from '../alarm/schema';
import { binarySensorSchema } from '../binary_sensor/schema';
import { climateSchema } from '../climate/schema';
import { groupSchema } from '../group/schema';
import { lockSchema } from '../lock/schema';
import { mediaSchema } from '../media/schema';
import { selectSchema } from '../select/schema';
import { sensorSchema } from '../sensor/schema';
import { toggleSchema } from '../toggle/schema';
import { vacuumSchema } from '../vacuum/schema';
import { weatherSchema } from '../weather/schema';
import { entityKindSchema, GROUP_DOMAINS, KIND_DOMAINS, VARIANT_DOMAINS } from './domains';

const widget = (kind: string, settings: Record<string, unknown>, variant: Widget['variant'] = 'full'): Widget => ({
  id: 'w',
  kind,
  x: 0,
  y: 0,
  w: 4,
  h: 2,
  variant,
  title: null,
  on_tap: null,
  settings,
});

const SCHEMAS: Record<keyof typeof KIND_DOMAINS, WidgetSchema> = {
  toggle: toggleSchema,
  lock: lockSchema,
  alarm: alarmSchema,
  climate: climateSchema,
  media: mediaSchema,
  vacuum: vacuumSchema,
  weather: weatherSchema,
  sensor: sensorSchema,
  binary_sensor: binarySensorSchema,
  select: selectSchema,
};

test('each per-Domain kind takes an entity of its own Domains and no other', () => {
  for (const [kind, schema] of Object.entries(SCHEMAS)) {
    assert.equal(schema.kind, kind);
    for (const domain of KIND_DOMAINS[kind as keyof typeof KIND_DOMAINS]) {
      assert.equal(validateWidget(widget(kind, { entity: `${domain}.x` }), schema).ok, true, `${kind} takes ${domain}`);
    }
    assert.equal(validateWidget(widget(kind, { entity: 'camera.x' }), schema).ok, false, `${kind} refuses a camera`);
  }
});

test('each per-Domain kind is titled and takes its one entity, as entityKindSchema writes it', () => {
  for (const [kind, schema] of Object.entries(SCHEMAS)) {
    assert.deepEqual(schema, {
      kind,
      variants: schema.variants,
      titled: true,
      settings: {
        entity: {
          type: 'entity',
          domains: KIND_DOMAINS[kind as keyof typeof KIND_DOMAINS],
          // A vacuum in `error` is a Malfunction (#80); no other kind declares one.
          ...(kind === 'vacuum' && { malfunction: ['error'] }),
        },
      },
    });
  }
  assert.deepEqual(entityKindSchema('climate', ['full', 'compact']), climateSchema);
});

test('a gate, a vacuum and a select have one form', () => {
  for (const schema of [lockSchema, vacuumSchema, selectSchema]) {
    assert.deepEqual(schema.variants, ['full']);
  }
  assert.equal(validateWidget(widget('lock', { entity: 'lock.cancello' }, 'compact'), lockSchema).ok, false);
});

test('a Group holds members of any shaped Domains, mixed, in order', () => {
  const ok = validateWidget(widget('group', { members: ['lock.cancello', 'lock.cancelletto'] }), groupSchema);
  const member = (entity: string) => ({ entity, name: null, variant: null, on_tap: null });
  assert.deepEqual(ok, { ok: true, settings: { members: [member('lock.cancello'), member('lock.cancelletto')] } });
  assert.equal(validateWidget(widget('group', { members: ['lock.cancello', 'light.salone'] }), groupSchema).ok, true);
  assert.equal(validateWidget(widget('group', { members: ['camera.ingresso'] }), groupSchema).ok, false);
  assert.equal(validateWidget(widget('group', { members: ['group.accessi'] }), groupSchema).ok, false);
  assert.equal(validateWidget(widget('group', { members: [] }), groupSchema).ok, false);
});

test('every Domain a kind stands for can be a Group member', () => {
  assert.deepEqual([...GROUP_DOMAINS].sort(), Object.values(KIND_DOMAINS).flat().sort());
  assert.equal(new Set(GROUP_DOMAINS).size, GROUP_DOMAINS.length, 'no Domain belongs to two kinds');
});

test("a Member takes a Variant where its Domain's kind has both forms", () => {
  const both = Object.entries(SCHEMAS).flatMap(([kind, schema]) =>
    schema.variants.length > 1 ? [...KIND_DOMAINS[kind as keyof typeof KIND_DOMAINS]] : []
  );
  assert.deepEqual([...VARIANT_DOMAINS].sort(), both.sort());
});
