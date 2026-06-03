export function handleBoldKeydown(event) {
  if (!(event.ctrlKey || event.metaKey) || event.key !== 'b') return;

  const el = event.target;
  if (el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT') return;

  event.preventDefault();

  const start = el.selectionStart;
  const end = el.selectionEnd;
  const value = el.value;

  if (start === end) {
    el.setRangeText('**', start, end, 'end');
    el.selectionStart = el.selectionEnd = start + 2;
  } else {
    const selected = value.substring(start, end);
    el.setRangeText(`**${selected}**`, start, end, 'end');
    el.selectionStart = start + 2;
    el.selectionEnd = end + 2;
  }

  el.dispatchEvent(new Event('input', { bubbles: true }));
}
