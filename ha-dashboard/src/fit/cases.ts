/**
 * What the Widget fit check measures (#72, `scripts/fit-widgets.ts`): each
 * Widget kind in its fullest state, the one with the most content, from the
 * fake house (`fake-house/manifest.yaml`) as the app gets it. The runner
 * drives the house into these states before it measures, and back after.
 *
 * No React: the runner imports it under plain Node too.
 */
import type { Variant } from '../document/schema';

/** The fit sheet's one Page, which a tap in a case may name. */
export const FIT_PAGE = 'fit';

export type Fullest = {
  settings: Record<string, unknown>;
  title?: string;
  /** Why this entity, in this state, is the kind at its fullest. */
  why: string;
};

/** Every kind's fullest Widget. A kind registered without one fails the check. */
export const FULLEST: Record<string, Fullest> = {
  toggle: {
    settings: { entity: 'light.luce_cucina' },
    why: 'a dimmable light that is on: icon, name, state with its brightness, and the dimmer',
  },
  lock: { settings: { entity: 'lock.esterno_cancello' }, why: 'a gate: its name, state, and both hold buttons' },
  alarm: {
    settings: { entity: 'alarm_control_panel.ezviz_alarm' },
    why: 'armed away: the longest state words, and every mode command',
  },
  climate: {
    settings: { entity: 'climate.corridoio_termostato' },
    why: 'heating, with its setpoint and the humidity beside it',
  },
  media: {
    settings: { entity: 'media_player.christian_s_lg_webos_2021_tv' },
    why: 'a TV that is on: its title, the transport controls and the volume',
  },
  vacuum: { settings: { entity: 'vacuum.roborock_s5_max' }, why: 'cleaning: state, battery and its commands' },
  weather: { settings: { entity: 'weather.forecast_casa' }, why: 'met.no with a forecast: the full card has every day' },
  sensor: {
    settings: { entity: 'sensor.generale_quadro_sonoff_100285d3f0_power' },
    why: 'a power reading in watts, the longest unit of the house’s sensors',
  },
  binary_sensor: { settings: { entity: 'binary_sensor.portone_ingresso' }, why: 'a door: its name and open/closed state' },
  select: {
    settings: { entity: 'select.soggiorno_roborock_s5_max_cleaning_mode' },
    why: 'the cleaning mode, whose options are the longest of the house’s selects',
  },
  group: {
    settings: { members: ['light.luce_cucina', 'light.luce_corridoio', 'light.led_cucina'] },
    why: 'three dimmable lights that are on: three rows, each with its dimmer',
  },
  camera_wall: {
    settings: {
      cameras: [
        'camera.telecamera_cancello',
        'camera.telecamera_cancelletto',
        'camera.telecamera_esterno_giardino',
        'camera.campanello_live_view',
      ],
    },
    why: 'all four cameras: the big Feed and three thumbnails',
  },
  chip_row: {
    settings: {
      cameras: [
        'camera.telecamera_cancello',
        'camera.telecamera_cancelletto',
        'camera.telecamera_esterno_giardino',
        'camera.campanello_live_view',
      ],
      alarm: 'alarm_control_panel.ezviz_alarm',
    },
    why: 'every chip it can show: the cameras and the alarm',
  },
  stats: {
    settings: { power: 'sensor.generale_quadro_sonoff_100285d3f0_power' },
    why: 'both numbers: lights on and the power',
  },
  room_tile: {
    // A temperature must be in the tile's own Area (ADR-0018); the thermostat is in corridoio.
    settings: { area: 'salone', light: 'light.luci_salone_2' },
    why: 'the living room with its lights on, its dimmer, and its chevron to a Page',
  },
  room_grid: {
    settings: {
      // Each opening a Page, so each tile has its chevron; each lit Area
      // chooses its own light, corridoio its own thermostat (ADR-0018).
      areas: ['salone', 'cucina', 'ingresso', 'corridoio', 'camera_chri', 'esterno'].map(area => ({
        area,
        light: { salone: 'light.luci_salone_2', cucina: 'light.luci_cucina_2' }[area] ?? null,
        temperature: area === 'corridoio' ? 'climate.corridoio_termostato' : null,
        on_tap: FIT_PAGE,
      })),
    },
    why: 'six Areas, each opening a Page, lights on in two of them, one with a temperature',
  },
  link: { settings: { icon: 'mdi:sofa' }, title: 'Soggiorno e cucina', why: 'an icon and a two-word title' },
  clock: { settings: {}, why: 'the time and the longest date words of the language' },
  indoor_reading: {
    settings: { temperature: 'climate.corridoio_termostato', humidity: 'sensor.corridoio_termostato_umidita' },
    why: 'a temperature with its humidity line',
  },
};

/** The six shipped catalogues: the check runs in each. */
export const FIT_LANGUAGES = ['en', 'it', 'es', 'ar', 'hi', 'zh-Hans'] as const;

/** One box measured: a kind, a Variant, which probe, its size, and the axes the headroom is checked on. */
export type Probe = {
  id: string;
  kind: string;
  variant: Variant;
  name: string;
  width: number;
  height: number;
  guards: readonly ('width' | 'height')[];
};

/** What the page measured for one probe: whether it fits with the headroom kept, and the room it has to spare. */
export type Measured = Probe & {
  fits: boolean;
  /** The most each guarded axis could lose and still fit, in px, the other axis unchanged. */
  spare: Partial<Record<'width' | 'height', number>>;
  error?: string;
};
