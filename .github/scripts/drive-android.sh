#!/usr/bin/env bash
# Install the embedded-bundle APK, launch it, and capture Maestro screenshots.
# Signed-in flows run only when QA_PRESENT=true. Never echo credentials or the environment.
set +x
set -u

OUT="${GITHUB_WORKSPACE}/maestro-artifacts"
mkdir -p "$OUT"
APK="${GITHUB_WORKSPACE}/android/app/build/outputs/apk/debug/app-debug.apk"
PKG="com.cityoftreestech.alwaysbestcare"
STATUS=0

flatten_screenshots() {
  local root
  for root in "$OUT" "$HOME/.maestro/tests" "$HOME/.local/state/maestro" "$GITHUB_WORKSPACE/.maestro"; do
    if [[ -d "$root" ]]; then
      find "$root" -type f -name '*.png' -exec cp -n {} "$OUT/" \; || true
    fi
  done
  find "$OUT" -mindepth 1 -type d -exec rm -rf {} + 2>/dev/null || true
}

collect_artifacts() {
  flatten_screenshots
  find "$OUT" -maxdepth 1 -type f -name '*.png' -printf '%f\n' | sort > "$OUT/screenshot-list.txt" || true
  echo "Screenshots:"
  cat "$OUT/screenshot-list.txt" || true
  local name
  local missing=0
  for name in 00-adb-launch.png 01-launch-login.png 02-reopen-login.png 03-reopen-again-login.png; do
    if [[ ! -s "$OUT/$name" ]]; then
      echo "Missing screenshot: $name"
      missing=1
    fi
  done
  if [[ "$missing" -ne 0 ]]; then
    exit 1
  fi
}
trap collect_artifacts EXIT

if [[ ! -f "$APK" ]]; then
  echo "APK not found at $APK"
  exit 1
fi

echo "Installing APK"
adb wait-for-device
adb install -r -t "$APK" || {
  echo "adb install failed"
  exit 1
}

echo "Launching $PKG"
adb shell am start -W -n "$PKG/.MainActivity" || echo "am start returned non-zero"
sleep 20
adb exec-out screencap -p > "$OUT/00-adb-launch.png" || echo "adb screencap failed"
adb shell am force-stop "$PKG" || true

run_maestro() {
  local flow="$1"
  echo "Maestro flow: $flow"
  local args=()
  local help
  help="$(maestro test --help 2>&1 || true)"
  mkdir -p "$OUT/maestro-debug"
  if grep -q -- '--debug-output' <<<"$help"; then
    args+=(--debug-output "$OUT/maestro-debug")
  fi
  if grep -q -- '--flatten-debug-output' <<<"$help"; then
    args+=(--flatten-debug-output)
  fi
  if grep -q -- '--test-output-dir' <<<"$help"; then
    args+=(--test-output-dir "$OUT/maestro-debug")
  fi
  maestro test "${args[@]}" "$flow"
}

export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=1

run_maestro "${GITHUB_WORKSPACE}/.maestro/launch.yaml" || STATUS=$?

if [[ "${QA_PRESENT:-false}" == "true" ]]; then
  node "${GITHUB_WORKSPACE}/.github/scripts/seed-qa-client.cjs" || STATUS=$?
  if [[ "$STATUS" -eq 0 ]]; then
    run_maestro "${GITHUB_WORKSPACE}/.maestro/signed-in.yaml" || STATUS=$?
  fi
else
  echo "QA_CLIENT_EMAIL and QA_CLIENT_PASSWORD are not both set. Skipping signed-in flows."
fi

exit "$STATUS"
