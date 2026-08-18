function SectionCard({ eyebrow, title, description, children, actions, className = '' }) {
  return (
    <section className={`panel ${className}`.trim()}>
      <div className="panel-header">
        <div>
          {eyebrow ? <p className="card-label">{eyebrow}</p> : null}
          <h3>{title}</h3>
          {description ? <p className="panel-copy">{description}</p> : null}
        </div>
        {actions ? <div className="panel-header-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export default SectionCard;
