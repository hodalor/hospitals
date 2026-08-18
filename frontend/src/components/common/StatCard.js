function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <p className="card-label">{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

export default StatCard;
