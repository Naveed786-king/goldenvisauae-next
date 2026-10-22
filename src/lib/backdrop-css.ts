// Frosted-glass blur rules, added as an inline <style> by the root layout.
//
// Why inline: the production CSS minifier rewrites every `backdrop-filter` in the
// bundled stylesheets to the old `-webkit-backdrop-filter` only. Current Chrome no
// longer understands the -webkit- name, so glass effects would lose their blur.
// Inline styles are not minified, so these always reach the browser.
const B = (sel: string, v: string) => `${sel}{-webkit-backdrop-filter:${v};backdrop-filter:${v}}`;

export const BACKDROP_CSS = [
  B('.glass', 'blur(18px) saturate(180%)'),
  B('.hdr-island', 'blur(var(--hdr-blur,22px)) saturate(190%)'),
  B('.hdr-solid .hdr-island', 'none'),
  B('.topbar', 'blur(14px) saturate(160%)'),
  B('.glass-menu', 'blur(24px) saturate(180%)'),
  B('.mnav', 'blur(22px) saturate(190%)'),
  B('.pill', 'blur(10px)'),
  B('.ink-panel', 'blur(24px) saturate(170%)'),
  B('.site-footer', 'blur(26px) saturate(170%)'),
  B('.glass-strong', 'blur(28px) saturate(200%)'),
  B('.btn-dark', 'blur(10px)'),
  B('.sheet-backdrop', 'blur(4px)'),
  B('.btn-outline', 'blur(8px)'),
  B('.backdrop-blur,.backdrop-blur-sm', 'blur(8px)'),
  B('.backdrop-blur-md', 'blur(14px)'),
  B('.backdrop-blur-xl', 'blur(24px)'),
].join('');
