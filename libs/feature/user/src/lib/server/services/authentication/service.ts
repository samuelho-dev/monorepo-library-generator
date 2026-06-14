import { AuthenticationDataAccess } from '@samuelho-dev/contract-user'
import { UserAuthenticationLive } from '@samuelho-dev/data-access-user'
import { Context, Effect, Layer } from 'effect'

export class AuthenticationFeature extends Context.Service<AuthenticationFeature>()(
  '@samuelho-dev/feature-user/AuthenticationFeature',
  {
    make: Effect.gen(function* () {
      yield* AuthenticationDataAccess
      return { run: () => Effect.succeed('authentication') }
    })
  }
) {
  static readonly DefaultWithoutDependencies = Layer.effect(this, this.make)
  static readonly Default = this.DefaultWithoutDependencies.pipe(
    Layer.provide([UserAuthenticationLive])
  )
}
