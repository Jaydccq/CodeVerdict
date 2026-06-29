# Ticket API

## Contract

- createTicket(payload) returns { status: 201, body } for a valid title.
- Blank titles return status 400.
- getTicket(id) returns 404 when the record is missing.
- updateStatus(id, status) persists the new status and returns 200.
