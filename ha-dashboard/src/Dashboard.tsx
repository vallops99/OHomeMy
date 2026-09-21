/**
 * The home screen (#7). Composed from a typed Slot array; every Area's
 * contents Derived from Home Assistant's registries at render (#3).
 */
import { home } from './screens/home';
import { Screen } from './screens/slots';

function Dashboard() {
  return <Screen slots={home} />;
}

export default Dashboard;
