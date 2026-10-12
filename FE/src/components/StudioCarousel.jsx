import { useId, useState } from 'react';
import Icon from './Icon.jsx';
const scenes = [
  ['website', 'Thiết kế và tập trung', 'Design and focus'],
  ['moodboard', 'Không gian sáng tạo', 'Creative space'],
  ['campaign', 'Cùng nhóm tiến lên', 'Move forward together'],
];
export default function StudioCarousel({ locale = 'vi' }) {
  const [index, setIndex] = useState(0), id = useId(), en = locale === 'en';
  const scene = scenes[index];
  return <figure className="studio-carousel" role="group" aria-roledescription={en ? 'image carousel' : 'slider ảnh'} aria-label={en ? 'Creative workspace illustrations' : 'Ảnh minh họa không gian sáng tạo'}>
    <div className="studio-carousel-photo" id={id}>
      <img key={scene[0]} src={'/images/studio/'+scene[0]+'.jpg'} alt="" width="720" height="300" loading="lazy" fetchPriority="low" onError={event=>{event.currentTarget.hidden=true;}} />
    </div>
    <figcaption className="studio-carousel-chrome">
      <div className="studio-carousel-caption" aria-live="polite" aria-atomic="true"><small>{en ? 'ILLUSTRATION' : 'ẢNH MINH HỌA'}</small><strong>{scene[en ? 2 : 1]}</strong></div>
    <div className="studio-carousel-controls">
      <button type="button" aria-label={en ? 'Previous illustration' : 'Ảnh minh họa trước'} aria-controls={id} onClick={()=>setIndex(value=>(value+scenes.length-1)%scenes.length)}><Icon name="chevron-left" /></button>
      <span>{index+1}/{scenes.length}</span>
      <button type="button" aria-label={en ? 'Next illustration' : 'Ảnh minh họa tiếp theo'} aria-controls={id} onClick={()=>setIndex(value=>(value+1)%scenes.length)}><Icon name="chevron-right" /></button>
    </div>
    </figcaption>
  </figure>;
}
