class ActivityLogService {
  constructor({ repository }) {
    this.repository = repository;
  }

  record(event) {
    if (!['CREATE', 'UPDATE', 'CLOSE'].includes(event.action)) {
      return null;
    }
    return this.repository.save(event);
  }

  summarizeByIssue() {
    const counts = new Map();
    for (const event of this.repository.all()) {
      counts.set(event.issueId, (counts.get(event.issueId) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([issueId, count]) => ({ issueId, count }));
  }
}

module.exports = { ActivityLogService };
