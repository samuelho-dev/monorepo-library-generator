import { ProfileDataAccess } from '@samuelho-dev/contract-user'
import { UserProfileLive } from '@samuelho-dev/data-access-user'
import { Context, Effect, Layer } from 'effect'

export class ProfileFeature extends Context.Service<ProfileFeature>()(
  '@samuelho-dev/feature-user/ProfileFeature',
  {
    make: Effect.gen(function* () {
      yield* ProfileDataAccess
      return { run: () => Effect.succeed('profile') }
    })
  }
) {
  static readonly DefaultWithoutDependencies = Layer.effect(this, this.make)
  static readonly Default = this.DefaultWithoutDependencies.pipe(Layer.provide([UserProfileLive]))
}
