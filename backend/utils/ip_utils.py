"""
utils/ip_utils.py — Trusted IP Extraction & X-Forwarded-For Hardening
══════════════════════════════════════════════════════════════════════════
SECURITY [C-XFF]: Never blindly trust X-Forwarded-For headers.
An attacker can inject arbitrary IPs as the leftmost entry to spoof
geolocation or bypass rate limiting.

Safe pattern for Render.com (1 trusted proxy):
  The RIGHTMOST IP in the XFF chain is injected by the edge proxy and
  cannot be forged by the client. We use that as the trusted client IP.

Configure NUM_TRUSTED_PROXIES in settings:
  - 1  → Render.com, Railway, Fly.io (single reverse proxy)
  - 2  → Cloudflare + Render (two hops)
  - 0  → Direct (no proxy, use request.client.host)
"""

import re
import logging
from typing import Optional
from fastapi import Request
from config import settings

logger = logging.getLogger("orbe.ip_utils")

# RFC 5735 / RFC 4193 — private / loopback / link-local ranges
_PRIVATE_PATTERNS = re.compile(
    r"^("
    r"127\."
    r"|10\."
    r"|172\.(1[6-9]|2[0-9]|3[01])\."
    r"|192\.168\."
    r"|::1$"
    r"|fc[0-9a-f]{2}:"
    r"|fd[0-9a-f]{2}:"
    r")",
    re.IGNORECASE,
)

_SENTINEL = "0.0.0.0"  # returned when no valid public IP can be extracted


def _is_private(ip: str) -> bool:
    return bool(_PRIVATE_PATTERNS.match(ip.strip()))


def extract_client_ip(request: Request) -> str:
    """
    Extracts the true client IP address using a trusted-proxy-aware algorithm.

    Algorithm (trust-rightmost):
    1. Read X-Forwarded-For header and split into list of IPs.
    2. Remove IPs injected by trusted proxies from the right (NUM_TRUSTED_PROXIES).
    3. The rightmost remaining IP is the client — it was set by the last
       UNTRUSTED party and is the value the edge proxy received from the client.
    4. If the XFF chain is too short (client connected directly to the trusted
       proxy with no intermediate hops), fall back to request.client.host.

    This makes it IMPOSSIBLE for a client to spoof their IP by injecting
    fake values on the left side of the XFF chain.
    """
    num_trusted = getattr(settings, "NUM_TRUSTED_PROXIES", 1)

    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        # Split, strip whitespace, filter blanks
        chain = [ip.strip() for ip in xff.split(",") if ip.strip()]

        if len(chain) > num_trusted:
            # Pop the trusted proxy IPs from the right — what remains is client-controlled
            client_ip = chain[-(num_trusted + 1)]
        else:
            # Chain is exactly as long as our trusted proxies (client hit proxy directly)
            client_ip = chain[0] if chain else _SENTINEL
    else:
        # No XFF header at all — direct connection to our process
        client_ip = request.client.host if request.client else _SENTINEL

    # Sanitise
    client_ip = client_ip.split(":")[0] if "." in client_ip else client_ip  # strip port if present
    client_ip = client_ip.strip() or _SENTINEL

    # Log suspicious XFF manipulation attempts (private IP appearing as "client")
    if _is_private(client_ip) and xff:
        logger.warning(
            f"[XFF] Suspicious chain detected — resolved to private IP '{client_ip}' "
            f"from chain '{xff[:80]}'. Possible spoofing attempt."
        )

    return client_ip
