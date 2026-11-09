"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = vm.createContext({ URL });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../src/targets.js"), "utf8"), context);
const { urlFor, resolve } = context.DiffTargets;
const target = resolve();
const open = (url) => urlFor(target, url);

test("opens pull requests, dropping sub-pages, queries, and anchors", () => {
  const pr = `${target.origin}/o/r/pull/12`;
  assert.equal(open("https://github.com/o/r/pull/12"), pr);
  assert.equal(open("https://github.com/o/r/pull/12/"), pr);
  assert.equal(open("https://github.com/o/r/pull/12/files?w=1"), pr);
  assert.equal(open("https://github.com/o/r/pull/12/changes#diff-abc123R4"), pr);
  assert.equal(open("https://github.com/o/r/pull/12#issuecomment-1"), pr);
  const sha = "a".repeat(40);
  assert.equal(open(`https://github.com/o/r/pull/12/commits/${sha}`), `${pr}/commits/${sha}`);
});

test("opens every compare range form", () => {
  for (const range of ["main...feature", "main..feature", "main...user:feature", "feature/x", "main...feature/x"]) {
    assert.equal(open(`https://github.com/o/r/compare/${range}?expand=1`), `${target.origin}/o/r/compare/${range}`);
  }
  assert.equal(open("https://github.com/o/r/compare/main...b/"), `${target.origin}/o/r/compare/main...b`);
});

test("opens commit pages", () => {
  assert.equal(open("https://github.com/o/r/commit/abc1234"), `${target.origin}/o/r/commit/abc1234`);
});

test("ignores pages without a diff", () => {
  for (const url of [
    "https://github.com/o/r/pull/new/feature",
    "https://github.com/o/r/pulls",
    "https://github.com/o/r/compare",
    "https://github.com/o/r/compare/",
    "https://github.com/o/r/blob/main/src/pull/1",
    "https://github.com/o/r/tree/main/compare/x",
    "https://github.com/o/r/commit/main",
    "https://github.example.com/o/r/pull/1",
    "not a url",
    undefined,
  ]) {
    assert.equal(open(url), null, url);
  }
});
