import { loadPracticeCatalog } from '../problem-catalog';

function main() {
  const catalog = loadPracticeCatalog();
  // eslint-disable-next-line no-console
  console.log(
    `Validated ${catalog.problems.length} practice problem(s) in ${catalog.problemsDir}`,
  );
}

main();
