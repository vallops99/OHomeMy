/**
 * The fake house driven into each Widget kind's fullest state for the fit
 * check (`fit-widgets.ts`, `src/fit/cases.ts`), and put back after: every
 * fake helper it changed, and the thermostat. Through Home Assistant's REST
 * API, with the dev server's token.
 */
import { readFileSync } from 'node:fs';

const env = (file: string) =>
  Object.fromEntries(
    readFileSync(file, 'utf8')
      .split('\n')
      .map(line => line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map(m => [m[1], m[2].replace(/^['"]|['"]$/g, '')])
  );
const { VITE_HA_URL } = env('.env');
const { VITE_HA_TOKEN } = env('.env.development');
const HA = (VITE_HA_URL ?? 'http://localhost:8123').replace(/\/$/, '');
const headers = { Authorization: `Bearer ${VITE_HA_TOKEN}`, 'Content-Type': 'application/json' };

export type State = { entity_id: string; state: string; attributes: Record<string, unknown> };

export const states = async (): Promise<State[]> => {
  const r = await fetch(`${HA}/api/states`, { headers });
  if (!r.ok) throw new Error(`Home Assistant answered ${r.status} at ${HA}`);
  return r.json();
};
const call = async (domain: string, service: string, data: Record<string, unknown>) => {
  const r = await fetch(`${HA}/api/services/${domain}/${service}`, { method: 'POST', headers, body: JSON.stringify(data) });
  if (!r.ok) console.warn(`  ! ${domain}.${service} ${JSON.stringify(data)}: HTTP ${r.status}`);
};

/** The house at its fullest for `FULLEST`: what each kind shows most of. */
export async function drive() {
  for (const id of ['light.luce_cucina', 'light.luce_corridoio', 'light.led_cucina', 'light.luci_salone_2', 'light.luci_cucina_2'])
    await call('light', 'turn_on', { entity_id: id, brightness: 180 });
  await call('media_player', 'turn_on', { entity_id: 'media_player.christian_s_lg_webos_2021_tv' });
  await call('alarm_control_panel', 'alarm_arm_away', { entity_id: 'alarm_control_panel.ezviz_alarm' });
  await call('vacuum', 'start', { entity_id: 'vacuum.roborock_s5_max' });
  await call('climate', 'set_temperature', { entity_id: 'climate.corridoio_termostato', temperature: 28, hvac_mode: 'heat' });
  // The dishwasher running with an open door and both warnings: its fullest.
  // Its sensors are template sensors over helpers, so the helpers are set.
  const finish = new Date(Date.now() + 320 * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const local = `${finish.getFullYear()}-${pad(finish.getMonth() + 1)}-${pad(finish.getDate())} ${pad(finish.getHours())}:${pad(finish.getMinutes())}:00`;
  const select = (sensor: string, option: string) =>
    call('input_select', 'select_option', { entity_id: `input_select.fake_mode_sensor_${DISHWASHER}_${sensor}`, option });
  await select('operation_state', 'run');
  await select('door', 'open');
  await select('salt_nearly_empty', 'present');
  await select('rinse_aid_nearly_empty', 'present');
  await call('input_datetime', 'set_datetime', {
    entity_id: `input_datetime.fake_time_sensor_${DISHWASHER}_program_finish_time`,
    datetime: local,
  });
  await call('input_number', 'set_value', { entity_id: `input_number.fake_value_sensor_${DISHWASHER}_program_progress`, value: 60 });
}

const DISHWASHER = 'cucina_lavastoviglie';

/** Puts back every fake helper, and the thermostat, as they were. */
export async function restore(before: State[]) {
  const now = new Map((await states()).map(s => [s.entity_id, s]));
  for (const s of before) {
    const [domain, object] = s.entity_id.split('.');
    if (!object.startsWith('fake_') || now.get(s.entity_id)?.state === s.state) continue;
    if (domain === 'input_boolean') await call(domain, s.state === 'on' ? 'turn_on' : 'turn_off', { entity_id: s.entity_id });
    else if (domain === 'input_number') await call(domain, 'set_value', { entity_id: s.entity_id, value: Number(s.state) });
    else if (domain === 'input_datetime') await call(domain, 'set_datetime', { entity_id: s.entity_id, datetime: s.state });
    else if (domain === 'input_select') await call(domain, 'select_option', { entity_id: s.entity_id, option: s.state });
  }
  const thermostat = before.find(s => s.entity_id === 'climate.corridoio_termostato');
  if (thermostat)
    await call('climate', 'set_temperature', {
      entity_id: thermostat.entity_id,
      temperature: thermostat.attributes.temperature,
      hvac_mode: thermostat.state,
    });
}
