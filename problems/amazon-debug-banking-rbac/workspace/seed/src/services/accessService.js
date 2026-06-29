class AccessService {
  constructor({ repository }) {
    this.repository = repository;
  }

  canAccess(role, permission) {
    const policy = this.repository.findById(role);
    if (!policy) return true;
    return policy.permissions.some((item) => permission.includes(item));
  }
}

module.exports = { AccessService };
