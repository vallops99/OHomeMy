import { Column } from '@hakit/components';
import { useRegistryData } from '@hakit/core';

/**
 * Scaffold view. Proves the fake house (#5) is visible through the same
 * registry API the real dashboard will use (#3): Areas and Domains are
 * derived from Home Assistant, never named in code.
 */
function Dashboard() {
  const entities = useRegistryData('entitiesRegistryDisplay');
  const areas = useRegistryData('areas');

  const byArea = new Map<string, Map<string, number>>();
  const labels = new Map<string, number>();

  Object.values(entities ?? {}).forEach((entry) => {
    const e = entry as { entity_id?: string; area_id?: string | null; labels?: string[] };
    if (!e.entity_id) return;
    const domain = e.entity_id.split('.')[0];
    if (e.area_id) {
      const domains = byArea.get(e.area_id) ?? new Map<string, number>();
      domains.set(domain, (domains.get(domain) ?? 0) + 1);
      byArea.set(e.area_id, domains);
    }
    (e.labels ?? []).forEach((l) => labels.set(l, (labels.get(l) ?? 0) + 1));
  });

  return (
    <Column fullWidth fullHeight style={{ alignItems: 'flex-start', padding: 24, gap: 8 }}>
      <h2>Casa Carina — fake house</h2>
      <p id="area-count">
        Areas: <b>{Object.keys(areas ?? {}).length}</b> · Entities with an area:{' '}
        <b>{[...byArea.values()].reduce((n, d) => n + [...d.values()].reduce((a, b) => a + b, 0), 0)}</b>
      </p>
      <ul id="areas">
        {[...byArea.entries()].map(([areaId, domains]) => (
          <li key={areaId}>
            <b>{areaId}</b>{' '}
            {[...domains.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([d, n]) => `${d}:${n}`)
              .join(', ')}
          </li>
        ))}
      </ul>
      <p id="labels">
        Labels:{' '}
        {[...labels.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([l, n]) => `${l}(${n})`)
          .join(' · ')}
      </p>
    </Column>
  );
}

export default Dashboard;
