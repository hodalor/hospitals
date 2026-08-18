import { useEffect, useState } from 'react';

const iconMap = {
  dashboard: '◫',
  patients: '◉',
  visits: '◎',
  appointments: '◌',
  departments: '▣',
  settings: '◪',
  settings_config: '◍',
  pharmacy: '◐',
  pharmacy_medications: '◒',
  services: '◧',
  services_conditions: '◔',
  services_diagnoses: '◕',
  services_lab: '◓',
  services_administrative: '◑',
  finance: '◈',
  finance_billing: '◈',
  finance_pricing: '◉',
  finance_receipts: '◌',
  duty: '◬',
  manual: '◮',
  users: '◍',
};

function Sidebar({ modules, activeModuleId, onNavigate }) {
  const [openGroups, setOpenGroups] = useState({});

  const renderBadge = (count, isActive = false) =>
    count > 0 ? (
      <span className={`nav-badge ${isActive ? 'nav-badge-active' : ''}`}>{count}</span>
    ) : null;

  useEffect(() => {
    const activeParent = modules.find((module) =>
      module.children?.some((child) => child.id === activeModuleId)
    );

    if (activeParent) {
      setOpenGroups((current) => ({
        ...current,
        [activeParent.id]: true,
      }));
    }
  }, [activeModuleId, modules]);

  const renderNavItem = (module, isChild = false) => (
    <button
      key={module.id}
      type="button"
      className={`nav-item ${isChild ? 'nav-item-sub' : ''} ${activeModuleId === module.id ? 'active' : ''}`}
      onClick={() => onNavigate(module.id)}
    >
      <span className="nav-icon" aria-hidden="true">
        {iconMap[module.id] || '•'}
      </span>
      <span className="nav-copy nav-copy-simple">
        <strong>{module.label}</strong>
      </span>
      {renderBadge(module.badgeCount, activeModuleId === module.id)}
    </button>
  );

  const toggleGroup = (groupId) => {
    setOpenGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-badge">HN</div>
        <div>
          <h2>HealthNova</h2>
          <p>Hospital manager</p>
        </div>
      </div>

      <div className="sidebar-scroll">
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {modules.map((module) =>
            module.children?.length ? (
              <div
                key={module.id}
                className={`nav-group ${openGroups[module.id] ? 'nav-group-open' : ''}`}
              >
                <button
                  type="button"
                  className="nav-group-label"
                  onClick={() => toggleGroup(module.id)}
                  aria-expanded={openGroups[module.id] ? 'true' : 'false'}
                >
                  <span className="nav-icon" aria-hidden="true">
                    {iconMap[module.id] || '•'}
                  </span>
                  <strong>{module.label}</strong>
                  {renderBadge(module.badgeCount, activeModuleId === module.id)}
                  <span className="nav-group-caret" aria-hidden="true">
                    {openGroups[module.id] ? '▾' : '▸'}
                  </span>
                </button>
                {openGroups[module.id] ? (
                  <div className="nav-subnav">{module.children.map((child) => renderNavItem(child, true))}</div>
                ) : null}
              </div>
            ) : (
              renderNavItem(module)
            )
          )}
        </nav>
      </div>
    </aside>
  );
}

export default Sidebar;
