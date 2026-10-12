export function homeTaskLink(kind, day) {
  const params = new URLSearchParams({ status: 'open', state: 'active', timeField: 'dueAt' });
  if (kind === 'overdue') params.set('overdue', 'true');
  else { if (kind === 'today') params.set('from', day); params.set('to', day); }
  return '#mine?' + params;
}
