# Password Reset Tokens

## Contract

- A token is valid when it exists, is not used, is not revoked, and now <= expiresAt.
- consumeToken(id, now) marks a valid token as used.
- Invalid or missing tokens throw INVALID_TOKEN.
