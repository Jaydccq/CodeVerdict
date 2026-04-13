-- =============================================================================
-- Exam Problems Seed Script
-- Algorithms Championship - 4 problems, 100 pts total
--
-- Usage:
--   psql -U postgres -d exam_platform -f exam-problems.sql
--
-- Adjust startTime / endTime before running.
-- =============================================================================

DO $$
DECLARE
  exam_id   INTEGER;
  p1_id     INTEGER;
  p2_id     INTEGER;
  p3_id     INTEGER;
  p4_id     INTEGER;
BEGIN

  -- ── Exam ────────────────────────────────────────────────────────────────
  INSERT INTO exams (title, "startTime", "endTime", "durationMinutes", "isActive", "allowedLanguages")
  VALUES (
    'Algorithms Championship',
    '2026-04-01 09:00:00+00',
    '2026-04-01 12:00:00+00',
    180,
    false,
    '[71, 62, 54, 93]'::jsonb   -- Python3=71, Java=62, C++=54, Node.js=93
  )
  RETURNING id INTO exam_id;

  -- ── Problem 1: Number of Islands (Hard · 30 pts) ────────────────────────
  INSERT INTO problems (
    title, description, "inputFormat", "outputFormat",
    constraints, "sampleInput", "sampleOutput",
    difficulty, "timeLimitMs", "memoryLimitKb", "maxScore"
  ) VALUES (
    'Number of Islands',
    'Given an m × n binary grid where ''1'' represents land and ''0'' represents water, return the number of islands. An island is surrounded by water and formed by connecting adjacent land cells horizontally or vertically.',
    'Line 1: two integers m and n (rows and columns)' || chr(10) ||
    'Next m lines: each is a string of n characters, either ''0'' or ''1'', with no spaces.',
    'A single integer - the number of distinct islands.',
    '1 ≤ m, n ≤ 300' || chr(10) || 'grid[i][j] is ''0'' or ''1''',
    '4 5' || chr(10) || '11110' || chr(10) || '11010' || chr(10) || '11000' || chr(10) || '00000',
    '1',
    'hard', 2000, 262144, 30
  )
  RETURNING id INTO p1_id;

  INSERT INTO problem_to_exam ("problemId", "examId", "displayOrder") VALUES (p1_id, exam_id, 1);

  -- TC1 visible
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p1_id, '4 5' || chr(10) || '11110' || chr(10) || '11010' || chr(10) || '11000' || chr(10) || '00000', '1', true, 1);
  -- TC2 single land cell
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p1_id, '1 1' || chr(10) || '1', '1', false, 2);
  -- TC3 single water cell
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p1_id, '1 1' || chr(10) || '0', '0', false, 3);
  -- TC4 all land
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p1_id, '3 3' || chr(10) || '111' || chr(10) || '111' || chr(10) || '111', '1', false, 4);
  -- TC5 all water
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p1_id, '3 3' || chr(10) || '000' || chr(10) || '000' || chr(10) || '000', '0', false, 5);
  -- TC6 checkerboard 3x3 → 5 islands
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p1_id, '3 3' || chr(10) || '101' || chr(10) || '010' || chr(10) || '101', '5', false, 6);
  -- TC7 outer ring + inner cell = 2 islands
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p1_id, '5 5' || chr(10) || '11111' || chr(10) || '10001' || chr(10) || '10101' || chr(10) || '10001' || chr(10) || '11111', '2', false, 7);
  -- TC8 single row, 3 separated islands
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p1_id, '1 7' || chr(10) || '1001001', '3', false, 8);
  -- TC9 memory stress: 300×300 checkerboard → 45,000 isolated islands
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (
    p1_id,
    '300 300' || chr(10) ||
    (SELECT string_agg(
      CASE WHEN gs % 2 = 1 THEN repeat('10', 150) ELSE repeat('01', 150) END,
      chr(10)
    ) FROM generate_series(1, 300) gs),
    '45000',
    false, 9
  );
  -- TC10 space stress: 300×300 all 1s → 1 island
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (
    p1_id,
    '300 300' || chr(10) || (SELECT string_agg(repeat('1', 300), chr(10)) FROM generate_series(1, 300)),
    '1',
    false, 10
  );

  -- ── Problem 2: Edit Distance (Hard · 25 pts) ────────────────────────────
  INSERT INTO problems (
    title, description, "inputFormat", "outputFormat",
    constraints, "sampleInput", "sampleOutput",
    difficulty, "timeLimitMs", "memoryLimitKb", "maxScore"
  ) VALUES (
    'Edit Distance',
    'Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2. Allowed operations: Insert a character, Delete a character, Replace a character.',
    'Two lines. Each line contains one string (may be empty).',
    'A single integer - the minimum edit distance.',
    '0 ≤ word1.length, word2.length ≤ 500' || chr(10) || 'Both strings consist of lowercase English letters only.',
    'horse' || chr(10) || 'ros',
    '3',
    'hard', 2000, 262144, 25
  )
  RETURNING id INTO p2_id;

  INSERT INTO problem_to_exam ("problemId", "examId", "displayOrder") VALUES (p2_id, exam_id, 2);

  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p2_id, 'horse' || chr(10) || 'ros', '3', true, 1);
  -- -- TC2 both empty
  -- INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  -- VALUES (p2_id, '' || chr(10) || '', '0', false, 2);
  -- -- TC3 one delete
  -- INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  -- VALUES (p2_id, 'a' || chr(10) || '', '1', false, 3);
  -- TC4 one insert
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p2_id, '' || chr(10) || 'a', '1', false, 4);
  -- TC5 identical
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p2_id, 'abc' || chr(10) || 'abc', '0', false, 5);
  -- TC6 all differ
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p2_id, 'abc' || chr(10) || 'def', '3', false, 6);
  -- TC7 classic
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p2_id, 'intention' || chr(10) || 'execution', '5', false, 7);
  -- TC8 kitten/sitting
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p2_id, 'kitten' || chr(10) || 'sitting', '3', false, 8);
  -- TC9 memory stress: 500×500 DP table, all replacements
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p2_id, repeat('a', 500) || chr(10) || repeat('b', 500), '500', false, 9);
  -- TC10 space stress: max-size strings, differ only at last char
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p2_id, repeat('a', 500) || chr(10) || repeat('a', 499) || 'b', '1', false, 10);

  -- ── Problem 3: Coin Change (Medium · 25 pts) ────────────────────────────
  INSERT INTO problems (
    title, description, "inputFormat", "outputFormat",
    constraints, "sampleInput", "sampleOutput",
    difficulty, "timeLimitMs", "memoryLimitKb", "maxScore"
  ) VALUES (
    'Coin Change',
    'You are given an integer array coins representing coin denominations and an integer amount. Return the fewest number of coins needed to make up the amount. If the amount cannot be made up by any combination of coins, return -1. You may use each coin denomination an unlimited number of times.',
    'Line 1: space-separated integers - the coin denominations.' || chr(10) ||
    'Line 2: a single integer - the target amount.',
    'A single integer - minimum coins needed, or -1 if impossible.',
    '1 ≤ coins.length ≤ 12' || chr(10) || '1 ≤ coins[i] ≤ 2^31 - 1' || chr(10) || '0 ≤ amount ≤ 10^4',
    '1 2 5' || chr(10) || '11',
    '3',
    'medium', 2000, 262144, 25
  )
  RETURNING id INTO p3_id;

  INSERT INTO problem_to_exam ("problemId", "examId", "displayOrder") VALUES (p3_id, exam_id, 3);

  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p3_id, '1 2 5' || chr(10) || '11', '3', true, 1);
  -- TC2 impossible
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p3_id, '2' || chr(10) || '3', '-1', false, 2);
  -- TC3 zero amount, single coin
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p3_id, '1' || chr(10) || '0', '0', false, 3);
  -- TC4 zero amount, multiple coins
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p3_id, '1 2 5' || chr(10) || '0', '0', false, 4);
  -- TC5 amount < min coin
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p3_id, '3 5 7' || chr(10) || '1', '-1', false, 5);
  -- TC6 greedy trap: 3+3=2 coins, not 4+1+1=3 coins
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p3_id, '1 3 4' || chr(10) || '6', '2', false, 6);
  -- TC7 10+10+5+2
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p3_id, '2 5 10' || chr(10) || '27', '4', false, 7);
  -- TC8 3+4
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p3_id, '3 4 5' || chr(10) || '7', '2', false, 8);
  -- TC9 memory stress: dp[0..10000] fully populated
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p3_id, '1' || chr(10) || '10000', '10000', false, 9);
  -- TC10 space stress: odd target with even coin, full dp stays -1
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p3_id, '2' || chr(10) || '9999', '-1', false, 10);

  -- ── Problem 4: Valid Parentheses (Easy · 20 pts) ────────────────────────
  INSERT INTO problems (
    title, description, "inputFormat", "outputFormat",
    constraints, "sampleInput", "sampleOutput",
    difficulty, "timeLimitMs", "memoryLimitKb", "maxScore"
  ) VALUES (
    'Valid Parentheses',
    'Given a string s containing only the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid. A string is valid if: open brackets are closed by the same type of bracket, open brackets are closed in the correct order, and every closing bracket has a corresponding open bracket.',
    'A single string consisting of bracket characters only.',
    '''true'' if the string is valid, ''false'' otherwise.',
    '1 ≤ s.length ≤ 10^4' || chr(10) || 's consists only of characters: ()[]{}',
    '()[]{}',
    'true',
    'easy', 2000, 262144, 20
  )
  RETURNING id INTO p4_id;

  INSERT INTO problem_to_exam ("problemId", "examId", "displayOrder") VALUES (p4_id, exam_id, 4);

  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p4_id, '()[]{}', 'true', true, 1);
  -- TC2 nested mixed
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p4_id, '{[()]}', 'true', false, 2);
  -- TC3 type mismatch
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p4_id, '(]', 'false', false, 3);
  -- TC4 interleaved - stack trap
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p4_id, '([)]', 'false', false, 4);
  -- TC5 square inside curly
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p4_id, '{[]}', 'true', false, 5);
  -- TC6 unmatched open
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p4_id, '(', 'false', false, 6);
  -- TC7 unmatched close
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p4_id, ']', 'false', false, 7);
  -- TC8 deep nesting
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p4_id, '((()))', 'true', false, 8);
  -- TC9 memory stress: stack peaks at 5000 entries then drains
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p4_id, repeat('(', 5000) || repeat(')', 5000), 'true', false, 9);
  -- TC10 space stress: 10k open brackets, stack never pops
  INSERT INTO test_cases ("problemId", input, "expectedOutput", "isVisible", "displayOrder")
  VALUES (p4_id, repeat('(', 10000), 'false', false, 10);

END $$;
