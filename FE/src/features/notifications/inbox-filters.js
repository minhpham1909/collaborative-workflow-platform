export function inboxFilters(hash=location.hash) {
  const params=new URLSearchParams(hash.split('?')[1]??'');
  return {read:['all','read','unread'].includes(params.get('read'))?params.get('read'):'all',category:['all','work','invitation','membership','organization_invitation','project_invitation'].includes(params.get('category'))?params.get('category'):'all',q:(params.get('q')??'').slice(0,200),from:/^\d{4}-\d{2}-\d{2}$/.test(params.get('from')??'')?params.get('from'):'',to:/^\d{4}-\d{2}-\d{2}$/.test(params.get('to')??'')?params.get('to'):''};
}
export function inboxReturn(hash=location.hash) {const value=new URLSearchParams(hash.split('?')[1]??'').get('returnTo');if(value?.split('?')[0]!=='#notifications'||value.length>2000)return '#notifications';const filters=inboxFilters(value);return '#notifications?'+new URLSearchParams(Object.entries(filters).filter(([,value])=>value));}
