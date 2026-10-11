import { Component, Suspense } from 'react';
import { InlineMessage, LoadingState } from './Feedback.jsx';

class RouteError extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    const english = this.props.locale === 'en';
    return <main lang={this.props.locale} className="project-info">
      <h1>{english ? 'Unable to open this screen' : 'Không thể mở màn hình này'}</h1>
      <InlineMessage>{english ? 'Check your connection and reload the page. If the problem persists, contact the administrator.' : 'Kiểm tra kết nối và tải lại trang. Nếu vẫn lỗi, hãy liên hệ quản trị viên.'}</InlineMessage>
      <button onClick={() => location.reload()}>{english ? 'Reload page' : 'Tải lại trang'}</button>
      <a href="#home">{english ? 'Back to Home' : 'Về Trang chủ'}</a>
    </main>;
  }
}

export default function RouteFrame({ children, locale = 'vi' }) {
  return <RouteError locale={locale}><Suspense fallback={<main lang={locale} aria-busy="true"><LoadingState>{locale === 'en' ? 'Loading screen…' : 'Đang tải màn hình…'}</LoadingState></main>}>{children}</Suspense></RouteError>;
}
