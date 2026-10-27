// Article HTML from the admin editor, the AI writer and translations is shown as raw HTML on the site.
// This allowlist keeps all normal formatting (headings, lists, tables, images, figures, links, video
// embeds) and drops anything that can run code: scripts, event handlers (in any quoting), javascript:
// links, <base>/<meta>/<form>, and embeds from unknown sites.
import sanitizeHtml from 'sanitize-html';

const EMBED_HOSTS = ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com', 'www.google.com', 'maps.google.com'];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption', 'h1', 'h2', 'iframe', 'picture', 'source', 'video', 'details', 'summary', 'section']),
  allowedAttributes: {
    '*': ['class', 'id', 'style', 'dir', 'lang', 'title', 'aria-*', 'data-*'],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding'],
    iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'loading', 'title', 'referrerpolicy'],
    source: ['src', 'srcset', 'type', 'media'],
    video: ['src', 'controls', 'poster', 'width', 'height', 'muted', 'loop', 'playsinline', 'preload'],
    td: ['colspan', 'rowspan', 'align'],
    th: ['colspan', 'rowspan', 'align', 'scope'],
    ol: ['start', 'type'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowedIframeHostnames: EMBED_HOSTS,
  allowProtocolRelative: false,
  // links that open a new tab must not get access to this page
  transformTags: {
    a: (tagName, attribs) => (attribs.target === '_blank' ? { tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } } : { tagName, attribs }),
  },
};

export function safeArticleHtml(html: string): string {
  return sanitizeHtml(String(html || ''), OPTIONS);
}
