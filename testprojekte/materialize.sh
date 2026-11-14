#!/usr/bin/env bash
# Copies all test projects to <outdir> and inserts the fake OpenAI key.
# The key is assembled here from parts so that no scanner (GitHub push
# protection, gitleaks on this repo) sees a complete key in the repository.
# Always run the engine against <outdir>, never against testprojekte/ itself.
set -euo pipefail

src="$(cd "$(dirname "$0")" && pwd)"
out="${1:?usage: materialize.sh <outdir>}"

p1="sk-TESTONLYTESTONLY1234"
p2="T3Blbk"
p3="FJTESTONLYTESTONLY5678"
key="${p1}${p2}${p3}"

rm -rf "$out"
mkdir -p "$out"
cp -R "$src"/0* "$out"/
# 07-leer is an empty folder; git cannot store empty folders, so it is created here.
mkdir -p "$out/07-leer"
# perl instead of sed -i / xargs -r: those differ between Linux and macOS.
export KEY="$key"
grep -rl '@@OPENAI_TEST_KEY@@' "$out" | while IFS= read -r f; do perl -pi -e 's/\@\@OPENAI_TEST_KEY\@\@/$ENV{KEY}/g' "$f"; done
echo "ok: test projects in $out"
