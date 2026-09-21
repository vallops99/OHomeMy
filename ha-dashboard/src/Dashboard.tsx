/**
 * The home screen (#7, format decided in #9). Composed from a typed Slot
 * array; every Area's contents Derived from Home Assistant's registries (#3).
 */
import { home } from './screens/home';
import { ScreenView } from './screens/ScreenView';

function Dashboard() {
  return <ScreenView screen={home} />;
}

export default Dashboard;
