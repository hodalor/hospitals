const toneMap = {
  Paid: 'success',
  Completed: 'success',
  Verified: 'success',
  Available: 'success',
  Stable: 'success',
  Closed: 'success',
  'Checked in': 'info',
  'With nurse': 'info',
  'In consultation': 'info',
  'At laboratory': 'info',
  'At pharmacy': 'info',
  'With doctor': 'info',
  'In triage': 'info',
  'At lab': 'info',
  'At radiology': 'info',
  'At cashier': 'info',
  Busy: 'warning',
  Attention: 'warning',
  'Results pending': 'warning',
  'Awaiting approval': 'warning',
  'Claim drafted': 'warning',
  'Waiting for doctor': 'warning',
  'Awaiting cashier': 'warning',
  Pending: 'warning',
  'Part paid': 'warning',
  Requested: 'warning',
  Escalated: 'danger',
  'High priority cases active': 'danger',
  'Emergency override': 'danger',
};

function StatusBadge({ value }) {
  const tone = toneMap[value] || 'neutral';

  return <span className={`status-badge status-${tone}`}>{value}</span>;
}

export default StatusBadge;
