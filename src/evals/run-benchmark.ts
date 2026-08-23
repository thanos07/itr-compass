import {
  BENCHMARK_ASSESSMENT_YEAR,
  BENCHMARK_CASES,
  BENCHMARK_VERSION,
  type EvalCategory,
} from "./benchmark-v1";

type Result = {
  id: string;
  category: EvalCategory;
  passed: boolean;
  detail: string;
};

const results: Result[] = BENCHMARK_CASES.map((testCase) => {
  try {
    return {
      id: testCase.id,
      category: testCase.category,
      passed: true,
      detail: testCase.run(),
    };
  } catch (error) {
    return {
      id: testCase.id,
      category: testCase.category,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
});

const categories: EvalCategory[] = [
  "Tax engine",
  "ITR form selection",
  "Legal retrieval",
  "Safety controls",
];

console.log(`ITR Compass Evaluation - AY ${BENCHMARK_ASSESSMENT_YEAR} - ${BENCHMARK_VERSION}`);
console.log("=".repeat(64));

for (const category of categories) {
  const categoryResults = results.filter((result) => result.category === category);
  const passed = categoryResults.filter((result) => result.passed).length;
  console.log(`${category.padEnd(20)} ${passed}/${categoryResults.length} passed`);
}

const passed = results.filter((result) => result.passed).length;
const accuracy = results.length ? (passed / results.length) * 100 : 0;

console.log("-".repeat(64));
console.log(`Overall              ${passed}/${results.length} (${accuracy.toFixed(1)}%)`);

const failures = results.filter((result) => !result.passed);
if (failures.length) {
  console.log("\nFailures:");
  for (const failure of failures) {
    console.log(`- ${failure.id}: ${failure.detail}`);
  }
  process.exitCode = 1;
} else {
  console.log("\nAll benchmark scenarios passed.");
}
