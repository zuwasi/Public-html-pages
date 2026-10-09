'use strict';

const gate = document.getElementById('gate');
const viewer = document.getElementById('viewer');
const frame = document.getElementById('report');
const password = document.getElementById('password');
const unlock = document.getElementById('unlock');
const status = document.getElementById('status');
const urls = [];
let busy = false;
let generation = 0;

function lock() {
  generation++;
  frame.removeAttribute('srcdoc');
  viewer.hidden = true;
  gate.hidden = false;
  urls.splice(0).forEach(url => URL.revokeObjectURL(url));
  password.value = '';
  status.textContent = '';
  password.focus();
}

function render(bytes) {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const manifestSize = new DataView(bytes.buffer).getUint32(0);
  const manifest = JSON.parse(decoder.decode(bytes.subarray(4, 4 + manifestSize)));
  let offset = 4 + manifestSize;
  let html;
  const media = new Map();
  for (const file of manifest.files) {
    if (!Number.isSafeInteger(file.size) || file.size < 0 || offset + file.size > bytes.length) {
      throw new Error('Invalid package');
    }
    const data = bytes.subarray(offset, offset + file.size);
    offset += file.size;
    if (file.path === manifest.entry) {
      html = decoder.decode(data);
    } else {
      const url = URL.createObjectURL(new Blob([data], { type: file.type }));
      urls.push(url);
      media.set(file.path, url);
    }
  }
  if (!html || offset !== bytes.length) throw new Error('Invalid package');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const node of doc.querySelectorAll('[src], [href], [poster]')) {
    for (const attribute of ['src', 'href', 'poster']) {
      const value = node.getAttribute(attribute);
      if (!value || value.startsWith('data:') || value.startsWith('#')) continue;
      if (!media.has(value)) throw new Error('Unavailable file');
      node.setAttribute(attribute, media.get(value));
    }
  }
  // Only publisher-authored HTML belongs in the encrypted package, never untrusted HTML.
  // The same-origin frame can use our media blobs; its CSP blocks network requests.
  doc.querySelector('meta[http-equiv="Content-Security-Policy"]').content =
    "default-src 'none'; img-src data: blob:; media-src blob:; font-src data:; " +
    "style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
  frame.srcdoc = '<!doctype html>\n' + doc.documentElement.outerHTML;
  gate.hidden = true;
  viewer.hidden = false;
  document.getElementById('lock').focus();
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
window.addEventListener('pagehide', lock);
