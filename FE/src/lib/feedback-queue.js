const priority = tone => tone === 'error' ? 3 : tone === 'warning' ? 2 : tone === 'info' ? 1 : 0;
export function enqueueFeedback(queue, item) {
  return [...queue.filter(old => old.message !== item.message || old.tone !== item.tone), item]
    .sort((a, b) => priority(b.tone) - priority(a.tone)).slice(0, 4);
}
