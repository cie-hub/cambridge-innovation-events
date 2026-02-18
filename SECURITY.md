# Security Policy

## Reporting a Vulnerability

If you discover a security issue, please report it privately by opening a GitHub issue marked **security** or emailing the maintainer directly. Do not disclose the vulnerability publicly until it has been addressed.

We aim to acknowledge reports within 48 hours and provide a fix or mitigation within 7 days.

## Scope

This project scrapes publicly available event listings and serves them via a read-only frontend. There is no user authentication, no user-generated content, and no payment processing.

Areas of concern include:
- Exposed environment variables or secrets
- Server-side request forgery via scraper URLs
- Injection in API responses served to the frontend
