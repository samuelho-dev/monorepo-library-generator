import { ProfileDataAccess } from '@samuelho-dev/contract-user/profile'
import { Config, Context, Effect, Layer } from 'effect'

export { ProfileDataAccess } from '@samuelho-dev/contract-user/profile'

export const UserProfileLive = Layer.succeed(ProfileDataAccess, {
  health: () => Effect.succeed(true)
})

export class UserProfileTestHarness extends Context.Service<
  UserProfileTestHarness,
  {
    readonly reset: () => void
    readonly snapshot: () => readonly string[]
  }
>()('@samuelho-dev/data-access-user/UserProfileTestHarness') {}

const makeUserProfileTestLayer = () => {
  const records: string[] = []
  return Layer.mergeAll(
    Layer.succeed(ProfileDataAccess, { health: () => Effect.succeed(true) }),
    Layer.succeed(UserProfileTestHarness, {
      reset: () => {
        records.length = 0
      },
      snapshot: () => records
    })
  )
}
export const UserProfileTest = Layer.suspend(() => makeUserProfileTestLayer())
export const UserProfileAuto = Layer.unwrap(
  Effect.map(Config.string('NODE_ENV').pipe(Config.withDefault('development')), (environment) =>
    environment === 'test' ? UserProfileTest : UserProfileLive
  )
)
