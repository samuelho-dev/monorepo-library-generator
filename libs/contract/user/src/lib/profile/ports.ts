import { Context, type Effect } from 'effect'

export class ProfileDataAccess extends Context.Service<
  ProfileDataAccess,
  {
    readonly health: () => Effect.Effect<boolean>
  }
>()('@samuelho-dev/contract-user/ProfileDataAccess') {}
