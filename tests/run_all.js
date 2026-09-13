/**
 * NEXXA AI ROBOT - MASTER TEST RUNNER
 * Runs all test suites in sequence and summarizes results.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const suites = [
    { name: 'System Modular Baseline (50 Tests)', file: 'test_system.js' },
    { name: 'Formal Mission Scope & Objectives (18 Tests)', file: 'test_nexxa_mission_scope.js' },
    { name: 'Speech & Voice Interaction Hardening (14 Groups)', file: 'test_speech_production.js' },
    { name: 'Dashboard Action Sync Suite', file: 'test_dashboard_action_sync.js' }
];

console.log('='.repeat(75));
console.log('         NEXXA AI ROBOT - FULL TEST RUNNER (ALL SUITES)');
console.log('='.repeat(75));

let allPassed = true;
const summary = [];

for (const s of suites) {
    console.log(`\n>>> RUNNING: ${s.name} (${s.file})...\n`);
    const filePath = path.join(__dirname, s.file);
    const result = spawnSync(process.execPath, [filePath], { stdio: 'inherit' });
    const passed = result.status === 0;
    summary.push({ name: s.name, passed });
    if (!passed) allPassed = false;
}

console.log('\n' + '='.repeat(75));
console.log('                 NEXXA ALL TEST SUITES SUMMARY');
console.log('='.repeat(75));
for (const res of summary) {
    const icon = res.passed ? 'PASS' : 'FAIL';
    console.log(`[${icon}] ${res.name}`);
}
console.log('='.repeat(75));

process.exit(allPassed ? 0 : 1);
