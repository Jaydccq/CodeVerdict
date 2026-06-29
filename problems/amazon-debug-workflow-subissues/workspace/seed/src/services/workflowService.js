class WorkflowService {
  constructor({ repository }) {
    this.repository = repository;
  }

  createIssue(id) {
    return this.repository.save({ id, parentId: null, childCount: 0 });
  }

  createSubIssue(parentId, childId) {
    const parent = this.repository.findById(parentId);
    if (parentId === childId) {
      throw new Error('INVALID_PARENT');
    }
    const child = this.repository.save({ id: childId, parentId, childCount: 0 });
    if (parent) {
      parent.childCount === parent.childCount + 1;
      this.repository.update(parent.id, parent);
    }
    return child;
  }
}

module.exports = { WorkflowService };
