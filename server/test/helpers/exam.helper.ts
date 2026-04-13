import { DataSource } from 'typeorm';
import { Exam } from '../../src/entities/exam.entity';
import { Problem } from '../../src/entities/problem.entity';
import { ProblemToExam } from '../../src/entities/problem-to-exam.entity';
import { TestCase } from '../../src/entities/test-case.entity';
import { Difficulty } from '../../src/entities/problem.entity';

export async function createActiveExam(
  dataSource: DataSource,
  overrides: Partial<Exam> = {},
): Promise<Exam> {
  const now = new Date();
  const examRepo = dataSource.getRepository(Exam);

  const exam = examRepo.create({
    title: 'Test Exam',
    startTime: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
    endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
    durationMinutes: 180,
    isActive: true,
    allowedLanguages: [71, 54, 62, 92, 63],
    ...overrides,
  });

  return examRepo.save(exam);
}

export async function createExpiredExam(
  dataSource: DataSource,
  overrides: Partial<Exam> = {},
): Promise<Exam> {
  const now = new Date();
  const examRepo = dataSource.getRepository(Exam);

  const exam = examRepo.create({
    title: 'Expired Exam',
    startTime: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
    endTime: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
    durationMinutes: 180,
    isActive: true,
    allowedLanguages: [92],
    ...overrides,
  });

  return examRepo.save(exam);
}

export async function createProblem(
  dataSource: DataSource,
  examId: number,
  overrides: Partial<Problem> & { displayOrder?: number } = {},
): Promise<Problem> {
  const problemRepo = dataSource.getRepository(Problem);
  const mappingRepo = dataSource.getRepository(ProblemToExam);

  const { displayOrder = 1, ...problemOverrides } = overrides;

  const problem = problemRepo.create({
    title: 'Two Sum',
    description: 'Given two numbers, return their sum.',
    inputFormat: 'Two integers a and b',
    outputFormat: 'A single integer',
    constraints: '1 <= a, b <= 1000',
    sampleInput: '2 3',
    sampleOutput: '5',
    difficulty: Difficulty.EASY,
    timeLimitMs: 2000,
    memoryLimitKb: 262144,
    maxScore: 10,
    ...problemOverrides,
  });

  const saved = await problemRepo.save(problem);

  const mapping = mappingRepo.create({
    problemId: saved.id,
    examId,
    displayOrder,
  });
  await mappingRepo.save(mapping);

  return saved;
}

export async function createTestCase(
  dataSource: DataSource,
  problemId: number,
  overrides: Partial<TestCase> = {},
): Promise<TestCase> {
  const testCaseRepo = dataSource.getRepository(TestCase);

  const testCase = testCaseRepo.create({
    problemId,
    input: '2 3',
    expectedOutput: '5',
    isVisible: true,
    displayOrder: 1,
    ...overrides,
  });

  return testCaseRepo.save(testCase);
}

export interface ExamWithProblems {
  exam: Exam;
  problems: Problem[];
  testCases: TestCase[];
}

/**
 * Creates a full exam with 2 problems, each having 2 visible + 1 hidden test case.
 */
export async function createExamWithProblems(
  dataSource: DataSource,
  examOverrides: Partial<Exam> = {},
): Promise<ExamWithProblems> {
  const exam = await createActiveExam(dataSource, examOverrides);

  const problem1 = await createProblem(dataSource, exam.id, {
    title: 'Sum of Two',
    description: 'Return the sum of two integers.',
    displayOrder: 1,
  });

  const problem2 = await createProblem(dataSource, exam.id, {
    title: 'Product of Two',
    description: 'Return the product of two integers.',
    sampleInput: '2 3',
    sampleOutput: '6',
    displayOrder: 2,
    difficulty: Difficulty.MEDIUM,
  });

  const testCases: TestCase[] = [];

  // Problem 1: 2 visible + 1 hidden
  testCases.push(
    await createTestCase(dataSource, problem1.id, {
      input: '2 3',
      expectedOutput: '5',
      isVisible: true,
      displayOrder: 1,
    }),
  );
  testCases.push(
    await createTestCase(dataSource, problem1.id, {
      input: '10 20',
      expectedOutput: '30',
      isVisible: true,
      displayOrder: 2,
    }),
  );
  testCases.push(
    await createTestCase(dataSource, problem1.id, {
      input: '0 0',
      expectedOutput: '0',
      isVisible: false,
      displayOrder: 3,
    }),
  );

  // Problem 2: 2 visible + 1 hidden
  testCases.push(
    await createTestCase(dataSource, problem2.id, {
      input: '2 3',
      expectedOutput: '6',
      isVisible: true,
      displayOrder: 1,
    }),
  );
  testCases.push(
    await createTestCase(dataSource, problem2.id, {
      input: '5 4',
      expectedOutput: '20',
      isVisible: true,
      displayOrder: 2,
    }),
  );
  testCases.push(
    await createTestCase(dataSource, problem2.id, {
      input: '1 1',
      expectedOutput: '1',
      isVisible: false,
      displayOrder: 3,
    }),
  );

  return { exam, problems: [problem1, problem2], testCases };
}
