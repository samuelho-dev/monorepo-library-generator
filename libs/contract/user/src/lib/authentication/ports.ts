import { Context, type Effect } from 'effect'

export class AuthenticationDataAccess extends Context.Service<
  AuthenticationDataAccess,
  {
    readonly health: () => Effect.Effect<boolean>
  }
>()('@samuelho-dev/contract-user/AuthenticationDataAccess') {}
