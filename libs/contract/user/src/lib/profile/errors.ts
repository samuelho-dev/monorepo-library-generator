import { Schema } from 'effect'

export class ProfileNotFoundError extends Schema.TaggedErrorClass<ProfileNotFoundError>()(
  'ProfileNotFoundError',
  {
    message: Schema.String,
    id: Schema.optional(Schema.String)
  }
) {}
