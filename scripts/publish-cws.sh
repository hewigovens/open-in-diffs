#!/usr/bin/env bash
set -euo pipefail

: "${CWS_CLIENT_ID:?missing CWS_CLIENT_ID}"
: "${CWS_CLIENT_SECRET:?missing CWS_CLIENT_SECRET}"
: "${CWS_REFRESH_TOKEN:?missing CWS_REFRESH_TOKEN}"
: "${CWS_EXTENSION_ID:?missing CWS_EXTENSION_ID}"

CRX="${1:?usage: publish-cws.sh <crx>}"
[ -f "$CRX" ] || { echo "crx not found: $CRX" >&2; exit 1; }

API="https://www.googleapis.com"
hdr=(-H "x-goog-api-version: 2")

# 1) refresh token -> access token
ACCESS_TOKEN=$(curl -sf -X POST https://oauth2.googleapis.com/token \
  -d client_id="$CWS_CLIENT_ID" \
  -d client_secret="$CWS_CLIENT_SECRET" \
  -d refresh_token="$CWS_REFRESH_TOKEN" \
  -d grant_type=refresh_token | jq -r '.access_token // empty')
[ -n "$ACCESS_TOKEN" ] || { echo "OAuth token exchange failed" >&2; exit 1; }
auth=(-H "Authorization: Bearer $ACCESS_TOKEN")

# 2) upload the signed crx (Verified CRX Uploads requires Google's raw-upload headers)
echo "Uploading $CRX to item $CWS_EXTENSION_ID ..."
UP=$(curl -sf -X PUT -T "$CRX" "${auth[@]}" "${hdr[@]}" \
  -H "X-Goog-Upload-Protocol: raw" \
  -H "X-Goog-Upload-File-Name: $(basename "$CRX")" \
  "$API/upload/chromewebstore/v1.1/items/$CWS_EXTENSION_ID")
echo "$UP"
echo "$UP" | jq -e '.uploadState == "SUCCESS"' >/dev/null \
  || { echo "upload did not succeed" >&2; exit 1; }

# 3) publish to the public channel
echo "Publishing ..."
PUB=$(curl -sf -X POST "${auth[@]}" "${hdr[@]}" -H "Content-Length: 0" \
  "$API/chromewebstore/v1.1/items/$CWS_EXTENSION_ID/publish")
echo "$PUB"
echo "$PUB" | jq -e '.status | index("OK") != null' >/dev/null \
  || { echo "publish returned a non-OK status (often means it is now in review)" >&2; }
echo "Done."
