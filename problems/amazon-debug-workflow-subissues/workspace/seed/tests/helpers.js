const { IssueRepository } = require('../src/repositories/issueRepository');
const { WorkflowService } = require('../src/services/workflowService');

function createFixture(seed = []) {
  const repository = new IssueRepository(seed);
  const service = new WorkflowService({ repository });
  return { repository, service };
}

function runTest(name, visibility, fn) {
  try {
    fn();
    return { name, visibility, passed: true };
  } catch (error) {
    return {
      name,
      visibility,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

module.exports = { createFixture, runTest };
