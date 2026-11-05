"""Run synthetic, network-isolated interface-language acceptance in a real browser."""

from __future__ import annotations

import argparse
import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend-url", required=True)
    parser.add_argument("--qa-nonce", required=True)
    args = parser.parse_args()
    backend = urlparse(args.backend_url)
    app_url = os.environ.get("APP_URL", "http://localhost:8092")
    app = urlparse(app_url)
    if any(
        url.scheme != "http"
        or url.hostname not in {"localhost", "127.0.0.1"}
        or url.port not in range(8090, 8100)
        for url in (backend, app)
    ):
        raise SystemExit("Local isolated QA ports 8090–8099 are required")
    if not args.qa_nonce:
        raise SystemExit("The QA attestation nonce is required")
    if os.environ.get("ONW_SYNTHETIC_PROFILE_QA") != "1":
        raise SystemExit("Set ONW_SYNTHETIC_PROFILE_QA=1 only for an isolated synthetic QA book")
    env = {
        key: os.environ[key]
        for key in ("PATH", "HOME", "TMPDIR", "CHROME_BIN")
        if key in os.environ
    }
    env.update(
        APP_URL=app_url,
        BACKEND_URL=args.backend_url,
        ONW_QA_NONCE=args.qa_nonce,
        ONW_SYNTHETIC_PROFILE_QA="1",
    )
    root = Path(__file__).resolve().parents[3]
    return subprocess.run(
        ["node", "--test", "--test-timeout=120000", "frontend/qa/interface-language.test.mjs"],
        cwd=root,
        env=env,
        timeout=160,
        check=False,
    ).returncode


if __name__ == "__main__":
    raise SystemExit(main())
