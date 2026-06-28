const fs = require('fs');

function solve() {
  const data = fs.readFileSync(0, 'utf8').trim().split(/\s+/);
  if (data.length === 0 || data[0] === '') {
    return;
  }

  const n = Number(data[0]);
  const nums = data.slice(1, 1 + n).map(Number);
  const target = Number(data[1 + n]);

  // Write your solution here.
  // Example:
  // console.log('0 1');
}

solve();
