import { AuthenticationDataAccess } from '@samuelho-dev/contract-user/authentication'
import { Config, Context, Effect, Layer } from 'effect'

export { AuthenticationDataAccess } from '@samuelho-dev/contract-user/authentication'

export const UserAuthenticationLive = Layer.succeed(AuthenticationDataAccess, {
  health: () => Effect.succeed(true)
})

export class UserAuthenticationTestHarness extends Context.Service<
  UserAuthenticationTestHarness,
  {
    readonly reset: () => void
    readonly snapshot: () => readonly string[]
  }
>()('@samuelho-dev/data-access-user/UserAuthenticationTestHarness') {}

const makeUserAuthenticationTestLayer = () => {
  const records: string[] = []
  return Layer.mergeAll(
    Layer.succeed(AuthenticationDataAccess, { health: () => Effect.succeed(true) }),
    Layer.succeed(UserAuthenticationTestHarness, {
      reset: () => {
        records.length = 0
      },
      snapshot: () => records
    })
  )
}
export const UserAuthenticationTest = Layer.suspend(() => makeUserAuthenticationTestLayer())
export const UserAuthenticationAuto = Layer.unwrap(
  Effect.map(Config.string('NODE_ENV').pipe(Config.withDefault('development')), (environment) =>
    environment === 'test' ? UserAuthenticationTest : UserAuthenticationLive
  )
)
