# Banking RBAC

## Contract

- A role has an explicit list of permissions.
- A permission must match exactly.
- The special permission "*" allows every action for that role.
- Unknown roles are denied.
- Access checks return true for allow and false for deny.
