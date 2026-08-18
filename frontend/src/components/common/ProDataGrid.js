function ProDataGrid({ items, variant = 'default' }) {
  return (
    <div className={`pro-data-grid${variant === 'expanded' ? ' pro-data-grid-expanded' : ''}`}>
      {items.map((item) => (
        <div className="pro-data-pair" key={item.label}>
          <div className="pro-data-label-cell">{item.label}</div>
          <div className="pro-data-value-cell">{item.value || '—'}</div>
        </div>
      ))}
    </div>
  );
}

export default ProDataGrid;
