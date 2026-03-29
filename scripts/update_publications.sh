#!/usr/bin/env bash
set -euo pipefail

# Wrapper for regenerating the local publications dataset.
# Accepts the same arguments as scripts/update_publications.py.
python scripts/update_publications.py "$@"
