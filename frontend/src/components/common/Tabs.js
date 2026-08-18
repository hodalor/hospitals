function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span>{tab.label}</span>
          {tab.badgeCount > 0 ? <span className="tab-badge">{tab.badgeCount}</span> : null}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
