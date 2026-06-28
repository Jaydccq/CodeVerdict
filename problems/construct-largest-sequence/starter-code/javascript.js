const fs = require('fs');

function solve() {
  const data = fs.readFileSync(0, 'utf8').trim().split(/\s+/);
  if (data.length === 0 || data[0] === '') {
    return;
  }

  const n = Number(data[0]);
  const values = data.slice(1, 1 + n).map(Number);
  const state = data[1 + n];
  const m = Number(data[2 + n]);

  // Implement constructLargestSequence(values, state, m).
  // Print the selected values separated by spaces.
  //
  // Example:
  // console.log('6 7');
}

solve();
