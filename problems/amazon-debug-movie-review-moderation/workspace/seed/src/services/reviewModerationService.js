class ReviewModerationService {
  constructor({ repository }) {
    this.repository = repository;
    this.bannedWords = ['spam', 'scam', 'abuse'];
  }

  submitReview(review, maxReviews) {
    if (this.bannedWords.some((word) => review.body.includes(word))) {
      this.repository.save({ ...review, status: 'rejected' });
      return { accepted: false };
    }
    const acceptedForUser = this.repository.all().filter((item) => item.userId === review.userId).length;
    if (acceptedForUser > maxReviews) {
      this.repository.save({ ...review, status: 'rejected' });
      return { accepted: false };
    }
    this.repository.save({ ...review, status: 'accepted' });
    return { accepted: true };
  }
}

module.exports = { ReviewModerationService };
