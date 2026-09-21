/**
 * The component layer.
 *
 * Screens import from here and from `../ha` only -- never from
 * `@hakit/components`. @hakit's licence prohibits modification as well as
 * redistribution, so if it breaks against a future Home Assistant release we
 * cannot patch it in place; replacement is the only remedy. Keeping every
 * import inside this directory is what makes that remedy affordable.
 */
export { Tile, type TileProps } from './Tile';
export { Grid } from './Grid';
export { Slider, type SliderProps } from './Slider';
export { Icon, DOMAIN_ICON, type IconProps } from './Icon';
export { RoomTile, type RoomTileProps } from './RoomTile';
export { GateSlab, type GateSlabProps } from './GateSlab';
export { StatusPanel, type StatusPanelProps } from './StatusPanel';
export { FaultTile, type FaultTileProps } from './FaultTile';
export { HakitTheme } from './HakitTheme';
export { stateLabel } from './stateLabel';
export { t, surfaceFor, onSurfaceFor } from './theme';
