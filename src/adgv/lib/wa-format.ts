// WhatsApp formatting (*bold*, _italic_, ~strike~, ```mono```, > quote, - list) shown as HTML: used for
// the admin previews and for emails, so both look like the WhatsApp message.
export /** WhatsApp marks to safe HTML for the preview. */
function waHtml(t: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return t
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map((line) => {
      let l = esc(line);
      l = l.replace(/```([^`]+)```/g, '<code>$1</code>');
      l = l.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1<b>$2</b>');
      l = l.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, '$1<i>$2</i>');
      l = l.replace(/(^|[\s(])~([^~\n]+)~(?=[\s).,!?:;]|$)/g, '$1<s>$2</s>');
      l = l.replace(/\{(\w+)\}/g, '<span class="wt-var">{$1}</span>');
      if (/^&gt; /.test(l)) l = `<span class="wt-q">${l.slice(5)}</span>`;
      if (/^[-•] /.test(l)) l = `• ${l.slice(2)}`;
      return l || '&nbsp;';
    })
    .join('<br>');
}
