import { Schema } from 'effect'

export const ProfileId = Schema.String.pipe(Schema.brand('ProfileId'))

export type ProfileId = typeof ProfileId.Type

export class Profile extends Schema.Class<Profile>('Profile')({
  id: ProfileId,
  name: Schema.String
}) {}
