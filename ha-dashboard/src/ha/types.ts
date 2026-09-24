/**
 * Our own vocabulary for what the house contains.
 *
 * These types are deliberately @hakit-free: they use plain `string` for entity
 * ids rather than @hakit's `EntityName`. That is what makes the seam real --
 * every consumer above `src/ha/` speaks these types, so replacing the library
 * underneath changes `src/ha/` and nothing else.
 *
 * Vocabulary follows CONTEXT.md: Area, Domain, Label, Derived, Composed,
 * Aggregate, Individual, Singleton, Unavailable.
 */

/** An entity id, `domain.object_id`. Plain string by design -- see above. */
export type EntityId = string;

/** The part of an entity id before the dot. */
export type Domain = string;

/** An Area id as registered in Home Assistant's area registry. */
export type AreaId = string;

/** A Label as maintained in Home Assistant's label registry (CONTEXT.md). */
export type Label = 'main' | 'vision' | 'gate' | 'security' | 'multiroom' | 'ignored' | (string & {});

/** One entity as the dashboard sees it: registry facts plus live state. */
export type Entity = {
  id: EntityId;
  domain: Domain;
  /** Friendly name, already resolved. Italian, from Home Assistant. */
  name: string;
  areaId: AreaId | null;
  /**
   * The device this entity belongs to, from the entity registry, or null for
   * an entity with no device (a template, a helper). Two entities on one
   * device are one physical thing: a camera and the motion sensor built into
   * it (CONTEXT.md, Derived).
   */
  deviceId: string | null;
  labels: Label[];
  /** Raw Home Assistant state string, e.g. `on`, `off`, `unavailable`. */
  state: string;
  attributes: Record<string, unknown>;
  /**
   * Home Assistant cannot reach this entity. Never hidden, always rendered as
   * a visible fault so a real problem in the house is visible at the panel
   * (map Notes).
   */
  unavailable: boolean;
};

/** An Area with its Derived contents. */
export type Area = {
  id: AreaId;
  name: string;
  /**
   * Labels applied to the Area itself, carrying half of every Placement
   * (#12). These are label *ids*, not names: Home Assistant slugifies a
   * label's name into its id, so the protocol's `page:main` is registered
   * under `page_main` and arrives here in that spelling.
   */
  labels: Label[];
  /**
   * The MDI icon Home Assistant's own area registry has for this Area (#13),
   * or null when the registry has none set. `RoomRow` falls back to a generic
   * glyph when this is null -- see its own default. Carried through exactly
   * like `labels` above: the area registry already has the right answer
   * (`cucina` -> `mdi:stove`, `camera_chri` -> `mdi:bed`, ...), so a
   * `PlacementView`-owned hardcoded map would just be restating what the
   * house already declares, one Area at a time, forever out of sync with it.
   */
  icon: string | null;
  /** Every entity registered to this Area, denylist already applied. */
  entities: Entity[];
};
