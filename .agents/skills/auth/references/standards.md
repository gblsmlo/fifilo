---
description: Authoritative external references for secure session authentication.
metadata:
  tags: [OWASP, RFC, MDN, NIST, standards, references]
  source: external
---

# External standards

Use these primary references when designing or reviewing authentication:

| Topic | Reference |
| --- | --- |
| Session management | [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) |
| Authentication controls | [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) |
| Authorization controls | [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) |
| Cookie attributes | [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie) |
| CSRF defenses | [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) |
| OAuth security | [RFC 9700, OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700) |
| Digital identity | [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html) |

## Reference use

- Prefer OWASP for implementation controls and threat scenarios.
- Prefer MDN for browser and cookie behavior.
- Prefer RFCs for interoperable protocol requirements.
- Prefer NIST for identity assurance and lifecycle decisions.

The starter uses Better Auth (`@fifilo/auth`) with the organization plugin.
Consult the vendor documentation in addition to these sources, but do not
replace protocol and browser requirements with vendor defaults.
