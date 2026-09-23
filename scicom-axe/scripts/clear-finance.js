'use strict';
/**
 * clear-finance.js — empty the finance records and start again.
 *
 *     node scripts/clear-finance.js
 *
 * Everything in the data folder is copied into data/_backups first, so this
 * can be undone by copying finance.json back out of there. The FIN- numbering
 * carries on from where it left off rather than restarting, so a number that
 * has already been written on a piece of paper is never handed out twice.
 *
 * The same thing is on the Department Finances screen, as a button. This
 * exists for when you would rather not go looking for it.
 */

const store = require('../lib/store');

const before = store.read('finance', []).length;
if (!before) {
  console.log('There were no finance records to remove.');
  process.exit(0);
}

const savedTo = store.backupAll('before-finance-clear');
store.write('finance', []);

console.log(`Removed ${before} finance record${before === 1 ? '' : 's'}.`);
console.log(`A copy of everything was saved in:\n  ${savedTo}`);
console.log('\nThe forms, policies, guides, tasks and rules are untouched.');
