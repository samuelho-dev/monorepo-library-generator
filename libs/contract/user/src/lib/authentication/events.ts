import { Schema } from 'effect'

export class AuthenticationCreatedEvent extends Schema.Class<AuthenticationCreatedEvent>(
  'AuthenticationCreatedEvent'
)({
  _tag: Schema.Literal('AuthenticationCreatedEvent'),
  id: Schema.String
}) {}
