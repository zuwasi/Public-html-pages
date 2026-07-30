# Claude Mythos Security Assessment Report
## Public HTML Pages — zuwasi.github.io/Public-html-pages

**Assessment date:** 2026-07-29  
**Assessor:** Claude Mythos Security Skill (Amp)  
**Target:** `~/Public-html-pages` (published at https://zuwasi.github.io/Public-html-pages/)  
**Branch:** main  
**Files in scope:** 74 HTML files + subdirectory presentations  
**Perspective:** Security review per Amit Tannenbaum's 9-item checklist for AI-generated HTML reports  
  (SAST, HTML Validator, Secrets Scanning, Privacy Scan, Business Logic Protection, DAST,  
   Network Inspection, Content Security Review, SHA-256 Validation)

---

## Executive Summary

**Overall security level: LOW RISK**

The published HTML presentations are fundamentally safe. No leaked AI system prompts,  
no real API keys or cloud credentials, no active data exfiltration, no malicious  
JavaScript, and no prompt injection vulnerabilities were found.

The findings that exist are cosmetic access-control flaws (client-side password gates  
on publicly retrievable static files), one third-party page-view tracker, and supply-  
chain hardening opportunities for external CDN scripts.

**Findings summary:**

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| F-001 | Plaintext password in HTML comment | Low | TODO |
| F-002 | Hardcoded plaintext password in JavaScript | Low | TODO |
| F-003 | Client-side password gate with public hash | Informational | TODO |
| F-004 | Third-party page-view tracking without disclosure | Low | TODO |
| F-005 | External CDN scripts without SRI integrity | Low | TODO |
| F-006 | Missing Content-Security-Policy on 73/74 files | Informational | TODO |
| F-007 | YouTube iframe embeds without sandbox/referrerpolicy | Low | TODO |
| F-008 | Passwords persist in git history | Informational | TODO |

**Positive observations:**
- No leaked AI system prompts or agent instructions
- No real API keys, tokens, AWS credentials, private keys, or GitHub tokens
- No eval(), no sendBeacon, no cookie theft, no data exfiltration
- No malicious or obfuscated JavaScript
- External links generally use rel="noopener" or rel="noopener noreferrer"
- The one file with a CSP (ai-coding-agent-cost-calculator.html) is properly scoped

---

## Amit Tannenbaum's 9-Item Checklist Results

| # | Check | Result | Findings |
|---|-------|--------|----------|
| 1 | Static Analysis (SAST) | PASS | Endor Labs scan: no problems found |
| 2 | HTML Validator | NOT RUN | Not in scope for this assessment |
| 3 | Secrets Scanning | FAIL | F-001: plaintext password in comment; F-002: hardcoded password in JS |
| 4 | Privacy Scan | FAIL | F-004: Abacus tracking; F-007: YouTube embeds leak visitor metadata |
| 5 | Business Logic Protection | FAIL | F-001/F-002/F-003: client-side password gates are bypassable by design |
| 6 | Dynamic Analysis (DAST) | NOT RUN | Static assessment only; recommended as follow-up |
| 7 | Network Inspection | WARN | F-004: 1 outbound fetch to abacus.jasoncameron.dev; F-005: 3 CDN scripts; Google Fonts |
| 8 | Content Security Review | PASS | No leaked prompts, no hidden instructions, no prompt injection |
| 9 | SHA-256 Validation | N/A | No artifact integrity verification mechanism in place |

---

## Findings

### F-001 — Plaintext password in HTML comment

**Status:** TODO  
**Severity:** Low  
**CVSS 4.0:** 0.0 None — `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:N/SC:N/SI:N/SA:N`  
**CVSS 3.1:** 0.0 None — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N`  
**CWE:** CWE-615 (Inclusion of Sensitive Information in Source Code Comments), CWE-259 (Use of Hard-coded Password)  
**Confidence:** confirmed  
**Affected components:**
- `SBOMator_vs_FiniteState_Decision.html:629`

**Description:**  
Line 629 contains:  
```js
const HASH = '1d98c5a13249a9b58b8c1135afe3ccea0ac3e6cfef668931e414eb9a8676d104'; // SHA-256 of 86999
```

The comment directly reveals the password `86999` that gates the presentation via a  
client-side SHA-256 comparison. Anyone viewing page source can read the password.

**Impact:**  
Low. The entire HTML content is already publicly retrievable on GitHub Pages — the  
password gate is cosmetic. The password is a trivially brute-forceable 5-digit number.  
No evidence that this password is reused elsewhere.

**Mitigation:**  
1. If the presentation is public: remove the password overlay entirely.  
2. If restricted: move behind server-side authentication.  
3. Rotate password if reused anywhere.

---

### F-002 — Hardcoded plaintext password in JavaScript

**Status:** TODO  
**Severity:** Low  
**CVSS 4.0:** 0.0 None — `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:N/SC:N/SI:N/SA:N`  
**CVSS 3.1:** 0.0 None — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N`  
**CWE:** CWE-259 (Use of Hard-coded Password), CWE-798 (Use of Hard-coded Credentials)  
**Confidence:** confirmed  
**Affected components:**
- `VeriMath_Pitch_Abel_Nazareth.html:156`

**Description:**  
Line 156 contains a direct plaintext password comparison:  
```js
function checkPwd(){var p=document.getElementById('pwdInput').value;
  if(p==='rty768'){document.getElementById('passwordOverlay').style.display='none';}
  else{...}}
```

The password `rty768` is hardcoded in the JavaScript source, visible to anyone who  
views page source or opens DevTools.

**Impact:**  
Low. Same as F-001 — the content is already public. The password gate provides no  
real access control on a static GitHub Pages site.

**Mitigation:**  
Same as F-001: remove the overlay or move content behind server-side auth.

---

### F-003 — Client-side password gate with public hash

**Status:** TODO  
**Severity:** Informational  
**CWE:** CWE-602 (Client-Side Enforcement of Server-Side Security)  
**Confidence:** confirmed  
**Affected components:**
- `nesher2gm-pentest-operator-guide.html:506`

**Description:**  
Line 506 contains a SHA-256 hash used for client-side password verification:  
```js
const HASH = '57d53049a3c5d81379ddddcb2f674a34f450cd296db62994cbd23f46480b38e0';
```

No plaintext password is exposed (unlike F-001/F-002), but the hash is publicly  
retrievable and can be brute-forced offline. More importantly, the entire HTML  
content is visible in page source regardless of the password gate.

**Impact:**  
Informational. The hash itself is not a secret leak, but the access control model  
is fundamentally broken for static content.

**Mitigation:**  
Same pattern as F-001/F-002. All three password gates should be evaluated together.

---

### F-004 — Third-party page-view tracking without disclosure

**Status:** TODO  
**Severity:** Low  
**CVSS 4.0:** 5.1 Medium — `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:P/VC:N/VI:N/VA:N/SC:L/SI:N/SA:N`  
**CVSS 3.1:** 4.7 Medium — `CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:N/A:N`  
**CWE:** CWE-359 (Exposure of Private Personal Information to an Unauthorized Actor)  
**Confidence:** confirmed  
**Affected components:**
- `ai-coding-agent-cost-calculator.html:846`

**Description:**  
Line 846 makes an outbound fetch to a third-party page counter:  
```js
fetch('https://abacus.jasoncameron.dev/hit/zuwasi-cost-calc/page')
```

This sends the visitor's IP address, User-Agent, and origin/referrer to  
`abacus.jasoncameron.dev` (Abacus go-attribution counter). The hit count is  
displayed on the page.

This file has a properly scoped CSP (line 6):  
```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'none'; script-src 'unsafe-inline'; 
  style-src 'unsafe-inline'; img-src 'self' data:; 
  connect-src https://abacus.jasoncameron.dev; ...">
```

The CSP correctly limits outbound connections to only the Abacus endpoint.

**Impact:**  
Low organizational severity. CVSS scores Medium because visitor metadata (IP, UA)  
is disclosed to a third party without explicit visitor consent or disclosure.  
However, the data sent is limited to page-visit metadata — no cookies, tokens,  
calculator inputs, or presentation content are transmitted.

**Mitigation:**  
1. If tracking is approved: add a visible privacy notice or cookie banner.  
2. If not approved: remove the fetch call and the hit counter display.  
3. Consider self-hosting a privacy-respecting counter if analytics are needed.

---

### F-005 — External CDN scripts without SRI integrity

**Status:** TODO  
**Severity:** Low  
**CWE:** CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)  
**Confidence:** confirmed  
**Affected components:**
- `baboons-benchmark-report.html:7` — `<script src="https://cdn.jsdelivr.net/npm/chart.js">` (unversioned!)
- `NotebookComparison_Presentation.html:8` — `<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js">`
- `1goat_Report.html:2882` — `<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js">`

**Description:**  
Three HTML files load external JavaScript from jsDelivr CDN. None use Subresource  
Integrity (SRI) attributes (`integrity=` / `crossorigin="anonymous"`).  
**Zero** files in the entire repository use SRI.

The `baboons-benchmark-report.html` script is particularly concerning: it loads  
`chart.js` without a version pin, meaning the script content can change at any  
time if the CDN or the package is compromised.

**Impact:**  
Low. If a CDN is compromised or a package is hijacked, arbitrary JavaScript could  
be injected into these pages. This is directly relevant to Amit Tannenbaum's  
"hidden JavaScript" concern — the scripts are trusted but not verified.

**Mitigation:**  
1. Pin exact versions for all CDN scripts (especially `chart.js` — currently unversioned).  
2. Add `integrity="sha384-..."` and `crossorigin="anonymous"` attributes.  
3. Consider self-hosting critical scripts.

---

### F-006 — Missing Content-Security-Policy on 73 of 74 files

**Status:** TODO  
**Severity:** Informational  
**CWE:** CWE-693 (Protection Mechanism Failure)  
**Confidence:** confirmed  
**Affected components:**
- All HTML files except `ai-coding-agent-cost-calculator.html`

**Description:**  
Only 1 of 74 HTML files has a Content-Security-Policy header. The remaining 73  
files have no CSP, meaning no browser-enforced restriction on what scripts can  
execute or what external resources can be loaded.

**Impact:**  
Informational. For static pages with no untrusted input, CSP is defense-in-depth  
rather than evidence of exploitability. However, adding CSP would limit the blast  
radius of any future XSS or supply-chain compromise.

**Mitigation:**  
Add a restrictive CSP meta tag to all HTML files. Prioritize pages that:
- Load external executable scripts (see F-005)
- Process query strings or hash fragments
- Use `innerHTML` or other DOM sinks
- Embed third-party iframes

---

### F-007 — YouTube iframe embeds without sandbox or referrerpolicy

**Status:** TODO  
**Severity:** Low  
**CWE:** CWE-359 (Exposure of Private Personal Information)  
**Confidence:** confirmed  
**Affected components:**
- `early-dos-html/index.html:47,98` — YouTube iframe embeds

**Description:**  
YouTube iframe embeds load `youtube.com/embed/17csYI-bAuk` without `sandbox`,  
`referrerpolicy`, or using the privacy-enhanced `youtube-nocookie.com` domain.  
YouTube embeds can track viewers through cookies and fingerprinting even if the  
video is not played.

**Impact:**  
Low. YouTube receives visitor IP, User-Agent, and potentially sets tracking cookies.  
This is a privacy concern similar to F-004 but through a different vector.

**Mitigation:**  
1. Replace `youtube.com/embed/` with `youtube-nocookie.com/embed/`.  
2. Add `referrerpolicy="no-referrer"` to iframe tags.  
3. Consider click-to-load embeds for privacy.

---

### F-008 — Passwords persist in git history

**Status:** TODO  
**Severity:** Informational  
**CWE:** CWE-615 (Inclusion of Sensitive Information in Source Code Comments)  
**Confidence:** confirmed  
**Affected components:**
- Git history of `SBOMator_vs_FiniteState_Decision.html`
- Git history of `VeriMath_Pitch_Abel_Nazareth.html`

**Description:**  
Even if the plaintext passwords (F-001, F-002) are removed from the current files,  
they remain in the public git history on GitHub, accessible to anyone.

**Impact:**  
Informational. The passwords gate publicly retrievable content, so historical  
exposure has the same (non-)impact as current exposure. However, if the passwords  
are reused elsewhere, they should be considered compromised.

**Mitigation:**  
1. Rotate passwords if reused anywhere.  
2. If historical removal is required: use `git filter-repo` or BFG Repo-Cleaner,  
   then force-push. Note this rewrites public history and all consumers must re-clone.

---

## Checks Performed

| Check | Method | Tool |
|-------|--------|------|
| Dependency scan | Endor Labs MCP | `mcp__endor_cli_tools__scan` (secrets + dependencies) |
| Secrets scan | Endor Labs MCP | `mcp__endor_cli_tools__scan` (secrets) |
| Manual secrets search | ripgrep | API keys, tokens, AWS creds, GitHub tokens, private keys, credential URLs |
| AI prompt leakage search | ripgrep (subagent) | System prompts, prompt templates, agent instructions, hidden comments |
| JavaScript/external calls search | ripgrep (subagent) | Script tags, fetch, XHR, tracking, eval, CDN, event handlers |
| External scripts inventory | ripgrep | `<script src=` patterns, SRI integrity check |
| CSP coverage check | ripgrep | `Content-Security-Policy` meta tags |
| YouTube/iframe check | ripgrep | youtube.com, youtu.be, iframe tags |
| Target link safety | ripgrep | target="_blank" + rel="noopener" check |
| Severity calibration | Oracle | CVSS scoring, CWE mapping, false-positive filtering |

## Limitations

1. **DAST not performed:** This is a static assessment. A live-browser HAR capture  
   on the published site is recommended to verify actual network behavior.
2. **Git history not scanned for secrets:** Only the current tree was scanned by Endor.  
   Historical commits may contain additional sensitive material.
3. **HTML validation not run:** Structural HTML issues were not checked.
4. **No DOM XSS testing:** Query-string and hash-fragment inputs were not tested  
   for DOM-based XSS vulnerabilities.
5. **Base64 content not fully inspected:** Large base64-encoded images were not  
   decoded to check for embedded metadata or steganographic content.

## Remediation Priority

| Priority | Finding | Action | Effort |
|----------|---------|--------|--------|
| Immediate (<1h) | F-001, F-002 | Remove plaintext passwords; decide if gates stay or go | S |
| Immediate (<1h) | F-004 | Decide if Abacus tracking is approved; document or remove | S |
| Short (1-3h) | F-005 | Pin CDN script versions; add SRI integrity attributes | M |
| Short (1-3h) | F-007 | Switch YouTube embeds to youtube-nocookie.com | S |
| Medium (3-8h) | F-003 | Evaluate all 3 password gates together; remove or move to server-side auth | M |
| Medium (3-8h) | F-006 | Add CSP meta tags to remaining 73 files | M |
| Low priority | F-008 | Consider git history cleanup if passwords were reused | M |

---

*Assessment performed using the Claude Mythos Security Skill (Amp) on 2026-07-29.*  
*Repository: https://github.com/zuwasi/Public-html-pages (branch main)*  
*Published site: https://zuwasi.github.io/Public-html-pages/*
