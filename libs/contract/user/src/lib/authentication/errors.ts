import { Schema } from 'effect'

export class AuthenticationNotFoundError extends Schema.TaggedErrorClass<AuthenticationNotFoundError>()(
  'AuthenticationNotFoundError',
  {
    message: Schema.String,
    id: Schema.optional(Schema.String)
  }
) {}
