'use strict';

const gate = document.getElementById('gate');
const viewer = document.getElementById('viewer');
const frame = document.getElementById('report');
const password = document.getElementById('password');
const unlock = document.getElementById('unlock');
const status = document.getElementById('status');
const urls = [];
const pages = new Map();
const media = new Map();
let routes = new Map();
let entry;
window.reportBrowser = { indexState: null };
let busy = false;
let generation = 0;

function lock() {
  generation++;
  frame.removeAttribute('srcdoc');
  viewer.hidden = true;
  gate.hidden = false;
  urls.splice(0).forEach(url => URL.revokeObjectURL(url));
  pages.clear();
  media.clear();
  routes.clear();
  entry = null;
  window.reportBrowser.indexState = null;
  password.value = '';
  status.textContent = '';
  password.focus();
}

function render(bytes) {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const manifestSize = new DataView(bytes.buffer).getUint32(0);
  const manifest = JSON.parse(decoder.decode(bytes.subarray(4, 4 + manifestSize)));
  let offset = 4 + manifestSize;
  for (const file of manifest.files) {
    if (!Number.isSafeInteger(file.size) || file.size < 0 || offset + file.size > bytes.length) {
      throw new Error('Invalid package');
    }
    const data = bytes.subarray(offset, offset + file.size);
    offset += file.size;
    if (file.type === 'text/html') {
      pages.set(file.path, decoder.decode(data));
    } else {
      const url = URL.createObjectURL(new Blob([data], { type: file.type }));
      urls.push(url);
      media.set(file.path, url);
    }
  }
  entry = manifest.entry;
  routes = new Map(Object.entries(manifest.routes));
  if (!pages.has(entry) || offset !== bytes.length) throw new Error('Invalid package');
  showPage();
  gate.hidden = true;
  viewer.hidden = false;
  document.getElementById('home').focus();
}

function showPage() {
  if (!entry) return;
  const route = location.hash.slice(1);
  const path = route ? routes.get(route.replace(/^p=/, '')) : entry;
  if (!pages.has(path)) {
    frame.srcdoc = '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><body><h1>Page not found</h1><p>This link is unavailable. Use Home to return to the collection.</p></body></html>';
    return;
  }
  const doc = new DOMParser().parseFromString(pages.get(path), 'text/html');
  for (const node of doc.querySelectorAll('[src], [href], [poster]')) {
    for (const attribute of ['src', 'href', 'poster']) {
      const value = node.getAttribute(attribute);
      if (!value || value.startsWith('data:') || value.startsWith('#')) continue;
      // Explicit source links may leave the viewer; no external assets are loaded.
      if (attribute === 'href' && node.tagName === 'A' && value.startsWith('https://')) {
        node.target = '_blank';
        node.rel = 'noopener noreferrer';
        continue;
      }
      const resolved = new URL(value, `https://package.invalid/${path}`);
      const target = resolved.pathname.slice(1);
      if (resolved.origin !== 'https://package.invalid') throw new Error('Unavailable file');
      if (attribute === 'href' && pages.has(target)) {
        const id = [...routes].find(([, page]) => page === target)?.[0];
        if (target !== entry && !id) throw new Error('Unavailable page');
        node.href = location.pathname + location.search + (id ? `#p=${id}` : '#');
        node.target = '_top';
      } else {
        if (!media.has(target)) throw new Error('Unavailable file');
        node.setAttribute(attribute, media.get(target));
      }
    }
  }
  // Only publisher-authored HTML belongs in the encrypted package, never untrusted HTML.
  // The same-origin frame can use our media blobs; its CSP blocks network requests.
  doc.querySelector('meta[http-equiv="Content-Security-Policy"]').content =
    "default-src 'none'; img-src data: blob:; media-src blob:; font-src data:; " +
    "style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
  frame.srcdoc = '<!doctype html>\n' + doc.documentElement.outerHTML;
}

document.getElementById('form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  if (!window.crypto?.subtle) {
    status.textContent = 'Open this page over HTTPS in a current browser.';
    return;
  }
  busy = true;
  unlock.disabled = true;
  const attempt = generation;
  let cleartext;
  let downloaded = false;
  const secret = new TextEncoder().encode(password.value);
  password.value = '';
  try {
    const material = await crypto.subtle.importKey('raw', secret, 'PBKDF2', false, ['deriveKey']);
    secret.fill(0);
    status.textContent = 'Loading encrypted content…';
    const response = await fetch('content.enc', { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('Download failed');
    const encrypted = new Uint8Array(await response.arrayBuffer());
    downloaded = true;
    if (encrypted.length < 52 || new TextDecoder().decode(encrypted.subarray(0, 8)) !== 'JHRPT001') {
      throw new Error('Invalid format');
    }
    status.textContent = 'Unlocking…';
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: encrypted.subarray(8, 24), iterations: 600000, hash: 'SHA-256' },
      material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
    cleartext = new Uint8Array(await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: encrypted.subarray(24, 36), additionalData: encrypted.subarray(0, 36), tagLength: 128 },
      key, encrypted.subarray(36)
    ));
    if (attempt === generation) render(cleartext);
  } catch {
    if (attempt === generation) {
      lock();
      status.textContent = downloaded
        ? 'Could not unlock. Check the password, or ask the sender for help.'
        : 'Could not load the encrypted content. Check your connection and try again.';
    }
  } finally {
    secret.fill(0);
    cleartext?.fill(0);
    busy = false;
    unlock.disabled = false;
  }
});

document.getElementById('lock').addEventListener('click', lock);
document.getElementById('home').addEventListener('click', () => {
  if (location.hash) location.hash = '';
  else showPage();
});
window.addEventListener('hashchange', showPage);
window.addEventListener('pagehide', lock);
