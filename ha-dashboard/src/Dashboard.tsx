import { Column, TimeCard } from '@hakit/components';
import { useHass, useEntity, useRegistryData } from '@hakit/core';

function Dashboard() {
  const { getAllEntities } = useHass.getState().helpers;
  const weather = useEntity('weather.forecast_casa');
  const entitiesRegistryDisplay = useRegistryData('entitiesRegistryDisplay');
  const mainMonitor = entitiesRegistryDisplay['media_player.27_smart_monitor_m5'];
  return (
    <Column fullWidth fullHeight>
      <h2>Successfully Authenticated!</h2>
      <p>The time below will update automatically from Home Assistant.</p>
      <TimeCard />
      <p>
        You have <b>{Object.keys(getAllEntities()).length}</b> entities to start automating with! Have fun!
      </p>
      <p id='weather-state'>
        weather.forecast_casa state: <b>{weather.state}</b>
      </p>
      <p id='registry-entry'>
        media_player.27_smart_monitor_m5 registry entry: <b>{JSON.stringify(mainMonitor)}</b>
      </p>
    </Column>
  );
}

export default Dashboard;
