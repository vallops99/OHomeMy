/**
 * How an entity of each Domain is drawn in a Widget (#52): alone, filling a
 * per-Domain kind's box, or as one member of a Group's card. One table, so a
 * gate is the same gate on its own and in a Group, and a Domain's look is
 * changed in one place.
 *
 * The shapes are `src/ui`'s components, sized by the box through their
 * `style`: what the Region used to decide (full in `left`/`right`, compact in
 * `footer`), the Widget's Variant decides now. A kind with one form draws it
 * for either Variant.
 *
 * An Unavailable entity is a Fault whatever its Domain: the Fault tile, with
 * its name and its state, in the place its shape would have taken. Always
 * shown, never hidden (CONTEXT.md, Unavailable), and nothing on it to press.
 */
import type { ComponentType, CSSProperties } from 'react';
import type { Variant } from '../../document/schema';
import type { Entity } from '../../ha';
import { fmt } from '../../i18n';
import { AccessRow } from '../../ui/AccessRow';
import { AlarmPanel } from '../../ui/AlarmPanel';
import { AlarmTile } from '../../ui/AlarmTile';
import { BinarySensorBlock, BinarySensorTile } from '../../ui/BinarySensorTile';
import { Card } from '../../ui/Card';
import { ClimateBlock, ClimateCard } from '../../ui/ClimateCard';
import { FaultTile } from '../../ui/FaultTile';
import { MediaBar } from '../../ui/MediaBar';
import { MediaCard } from '../../ui/MediaCard';
import { ReadingBlock } from '../../ui/ReadingBlock';
import { SelectTile } from '../../ui/SelectTile';
import { SensorBlock, SensorTile } from '../../ui/SensorTile';
import { stateLabel } from '../../ui/stateLabel';
import { t } from '../../ui/theme';
import { VacuumCard } from '../../ui/VacuumCard';
import { WeatherCard } from '../../ui/WeatherCard';
import { conditionIcon, conditionLabel } from '../../ui/weatherState';
import { ToggleView } from '../toggle/ToggleView';
import type { KIND_DOMAINS } from './domains';

/**
 * Alone, a card is at least its box and grows past it when its content does,
 * and the box scrolls (`.ohm-widget`): a Page that fits never does.
 */
export const CARD_ALONE: CSSProperties = { flex: 1, minWidth: 0, alignSelf: 'flex-start', minHeight: '100%', maxHeight: 'none' };

/** Alone, a tile is exactly its box, however short: no floor, no cap. */
const TILE_ALONE: CSSProperties = { flex: 1, minWidth: 0, height: '100%', minHeight: 0, maxHeight: 'none' };

/**
 * In a Group's card, a member takes its share of the room the card has
 * spare, and never less than itself: a long Group scrolls rather than
 * squashing its rows.
 */
const MEMBER: CSSProperties = { flex: '1 0 auto', minWidth: 0, maxHeight: 'none' };

type ShapeProps = { entity: Entity; variant: Variant; member: boolean };

const box = (member: boolean, alone: CSSProperties) => (member ? MEMBER : alone);

function Lock({ entity, member }: ShapeProps) {
  // An `AccessRow` always has its card: in a Group, the Group's; alone, one
  // of its own with no title, the row in the middle of it.
  if (member) return <AccessRow entity={entity} />;
  return (
    <Card style={{ ...CARD_ALONE, justifyContent: 'center' }}>
      <AccessRow entity={entity} />
    </Card>
  );
}

function Alarm({ entity, variant, member }: ShapeProps) {
  return variant === 'full' ? (
    <AlarmPanel entity={entity} style={box(member, CARD_ALONE)} />
  ) : (
    <AlarmTile entity={entity} style={box(member, TILE_ALONE)} />
  );
}

function Climate({ entity, variant, member }: ShapeProps) {
  return variant === 'full' ? (
    <ClimateCard entity={entity} style={box(member, CARD_ALONE)} />
  ) : (
    <ClimateBlock entity={entity} style={box(member, TILE_ALONE)} />
  );
}

function Media({ entity, variant, member }: ShapeProps) {
  // The compact strip's floor is the old footer's, which a box has no use for.
  return variant === 'full' ? (
    <MediaCard entity={entity} style={box(member, CARD_ALONE)} />
  ) : (
    <MediaBar entities={[entity]} style={{ ...box(member, TILE_ALONE), minWidth: 0 }} />
  );
}

function Vacuum({ entity, member }: ShapeProps) {
  return <VacuumCard entity={entity} style={box(member, CARD_ALONE)} />;
}

function Weather({ entity, variant, member }: ShapeProps) {
  if (variant === 'full') return <WeatherCard entity={entity} style={box(member, CARD_ALONE)} />;
  // Compact: the condition now and its temperature, read as a sensor is.
  const temperature = typeof entity.attributes.temperature === 'number' ? fmt.wholeDegrees(entity.attributes.temperature) : '--';
  return (
    <ReadingBlock
      icon={conditionIcon(entity.state)}
      value={temperature}
      detail={conditionLabel(entity.state)}
      name={entity.name}
      style={box(member, TILE_ALONE)}
    />
  );
}

function Sensor({ entity, variant, member }: ShapeProps) {
  return variant === 'full' ? (
    <SensorTile entity={entity} style={box(member, TILE_ALONE)} />
  ) : (
    <SensorBlock entity={entity} style={box(member, TILE_ALONE)} />
  );
}

function BinarySensor({ entity, variant, member }: ShapeProps) {
  return variant === 'full' ? (
    <BinarySensorTile entity={entity} style={box(member, TILE_ALONE)} />
  ) : (
    <BinarySensorBlock entity={entity} style={box(member, TILE_ALONE)} />
  );
}

function Select({ entity, member }: ShapeProps) {
  return <SelectTile entity={entity} style={box(member, TILE_ALONE)} />;
}

function Toggle({ entity, variant, member }: ShapeProps) {
  // `ToggleView` fills its box by itself; in a card it is a row of the old
  // Row's height instead.
  return (
    <ToggleView entity={entity} variant={variant} style={member ? { ...MEMBER, height: 'auto', minHeight: t.layout.rowRoom } : undefined} />
  );
}

type ShapedDomain = (typeof KIND_DOMAINS)[keyof typeof KIND_DOMAINS][number];

/** Every Domain in `KIND_DOMAINS`, and only those: the compiler checks both ways. */
const SHAPES: Record<ShapedDomain, ComponentType<ShapeProps>> = {
  light: Toggle,
  switch: Toggle,
  fan: Toggle,
  input_boolean: Toggle,
  siren: Toggle,
  lock: Lock,
  alarm_control_panel: Alarm,
  climate: Climate,
  media_player: Media,
  vacuum: Vacuum,
  weather: Weather,
  sensor: Sensor,
  binary_sensor: BinarySensor,
  select: Select,
};

/**
 * One entity in its Domain's shape, or the Fault tile while it is
 * Unavailable. A Domain with no shape draws nothing; the schemas let none
 * through.
 */
export function EntityShape({ entity, variant, member }: ShapeProps) {
  if (entity.unavailable) {
    return <FaultTile icon='mdi:alert-circle' label={entity.name} detail={stateLabel(entity)} style={box(member, TILE_ALONE)} />;
  }
  const Shape = (SHAPES as Record<string, ComponentType<ShapeProps> | undefined>)[entity.domain];
  return Shape ? <Shape entity={entity} variant={variant} member={member} /> : null;
}
