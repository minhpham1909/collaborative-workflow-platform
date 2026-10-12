import FormField from './FormField.jsx';
import ProjectIconPicker from './ProjectIconPicker.jsx';
import StudioCover from './StudioCover.jsx';
import Icon from './Icon.jsx';
import { workspaceText } from '../lib/workspace-text.js';
import { workspaceColors, workspaceCovers } from '../lib/workspace-identity.js';
import './workspace-identity.css';
export default function WorkspaceIdentityFields({ name, value, onChange, disabled = false, error, locale = 'vi' }) {
  const t = text => workspaceText(text, locale);
  const change = (key, next) => onChange({ ...value, [key]: next });
  return <div className="workspace-identity-fields">
    <FormField label={t('Mục tiêu ngắn')} hint={t('Tùy chọn · Một dòng, tối đa 500 ký tự.')} error={error}>
      {props => <input {...props} value={value.summary} maxLength={500} disabled={disabled} onChange={event => change('summary', event.target.value)} />}
    </FormField>
    <ProjectIconPicker label={t('Biểu tượng Workspace')} locale={locale} value={value.icon} disabled={disabled} onChange={next => change('icon', next)} />
    <div className="workspace-identity-controls">
      <FormField label={t('Màu nhận diện')}>{props => <select {...props} value={value.color} disabled={disabled} onChange={event => change('color', event.target.value)}>{workspaceColors.map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select>}</FormField>
      <FormField label={t('Ảnh bìa mẫu')}>{props => <select {...props} value={value.coverId} disabled={disabled} onChange={event => change('coverId', event.target.value)}>{workspaceCovers.map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select>}</FormField>
    </div>
    <div className="workspace-identity-preview" aria-label={t('Xem trước Workspace')}>
      <StudioCover id="workspace-preview" coverId={value.coverId} />
      <div><span className={'symbol label-color-' + value.color}><Icon name={value.icon} /></span><strong>{name.trim() || t('Workspace mới')}</strong><p>{value.summary || t('Mục tiêu có thể bổ sung sau.')}</p></div>
    </div>
  </div>;
}
