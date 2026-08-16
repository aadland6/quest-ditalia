// Node entry point for the SRS core tests (requires Node 18+). Run: node test-srs.mjs
// (The browser runs the same assertions via selftest.html, which also tests IndexedDB.)
import { runCore } from './srs-tests.js';
const { pass, fail } = await runCore((line) => console.log(line));
console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ FAILURES'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
