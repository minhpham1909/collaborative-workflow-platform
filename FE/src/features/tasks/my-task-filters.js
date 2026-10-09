const id = /^[a-f0-9]{24}$/;
export const defaultFilters = { q: '', status: 'open', state: 'active', priority: '', workspaceId: '', projectId: '', labelId: '', timeField: 'createdAt', from: '', to: '', overdue: false };
export function readMyTaskFilters(hash = location.hash) {
  const params = new URLSearchParams(hash.split('?')[1] ?? '');
  const values = { ...defaultFilters };
  for (const key of ['workspaceId','projectId','labelId']) if (id.test(params.get(key) ?? '')) values[key] = params.get(key);
  for (const [key, options] of Object.entries({ status: ['all','open','todo','in_progress','done'], state: ['active','archived','all'], priority: ['high','medium','low'], timeField: ['createdAt','dueAt'] })) if (options.includes(params.get(key))) values[key] = params.get(key);
  for (const key of ['from','to']) if (/^\d{4}-\d{2}-\d{2}$/.test(params.get(key) ?? '')) values[key] = params.get(key);
  values.q = (params.get('q') ?? '').slice(0,200); values.overdue = params.get('overdue') === 'true';
  if (!values.workspaceId) { values.projectId = ''; values.labelId = ''; }
  if (!values.projectId) values.labelId = '';
  return values;
}
export function myTaskParams(filters) {
  const params = new URLSearchParams();
  for (const [key,value] of Object.entries(filters)) if (value !== '' && value !== false) params.set(key,String(value));
  return params;
}
export function myTaskReturn(hash = location.hash) {
  const value = new URLSearchParams(hash.split('?')[1] ?? '').get('returnTo');
  return value?.split('?')[0] === '#mine' && value.length <= 2000 ? '#mine?' + myTaskParams(readMyTaskFilters(value)) : null;
}
