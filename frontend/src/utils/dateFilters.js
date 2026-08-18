export function normalizeDateValue(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    const matchedDate = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (matchedDate) {
      return matchedDate[0];
    }
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toISOString().slice(0, 10);
}

export function isWithinDateRange(value, startDate, endDate) {
  const normalizedValue = normalizeDateValue(value);

  if (!startDate && !endDate) {
    return true;
  }

  if (!normalizedValue) {
    return false;
  }

  if (startDate && normalizedValue < startDate) {
    return false;
  }

  if (endDate && normalizedValue > endDate) {
    return false;
  }

  return true;
}
