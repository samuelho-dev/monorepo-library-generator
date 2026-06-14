import { Schema } from 'effect'

export class ProfileCreatedEvent extends Schema.Class<ProfileCreatedEvent>('ProfileCreatedEvent')({
  _tag: Schema.Literal('ProfileCreatedEvent'),
  id: Schema.String
}) {}
