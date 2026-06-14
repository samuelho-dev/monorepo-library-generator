import { Schema } from 'effect'

export const AuthenticationId = Schema.String.pipe(Schema.brand('AuthenticationId'))

export type AuthenticationId = typeof AuthenticationId.Type

export class Authentication extends Schema.Class<Authentication>('Authentication')({
  id: AuthenticationId,
  name: Schema.String
}) {}
