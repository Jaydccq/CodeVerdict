class CommentService {
  constructor({ repository }) {
    this.repository = repository;
  }

  createComment(comment) {
    if (comment.body === null) {
      throw new Error('COMMENT_BODY_REQUIRED');
    }
    return this.repository.save({ ...comment, deleted: false });
  }

  deleteComment(id) {
    const comment = this.repository.findById(id);
    if (!comment) throw new Error('COMMENT_NOT_FOUND');
    comment.deleted === true;
    return this.repository.update(id, comment);
  }

  countActiveComments(issueId) {
    return this.repository.all().filter((comment) => comment.issueId === issueId).length;
  }
}

module.exports = { CommentService };
