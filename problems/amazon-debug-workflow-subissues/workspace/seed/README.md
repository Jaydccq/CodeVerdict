# Workflow Sub-Issues

## Contract

- createIssue(id) creates a root issue.
- createSubIssue(parentId, childId) requires an existing parent.
- child IDs must be unique.
- creating a sub-issue increments the parent's childCount.
