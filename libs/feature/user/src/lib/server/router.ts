import { UserAuthenticationTest, UserProfileTest } from '@samuelho-dev/data-access-user'
import { Config, Effect, Layer } from 'effect'
import { AuthenticationFeature } from './services/authentication/service'
import { ProfileFeature } from './services/profile/service'

export const UserFeatureLive = Layer.mergeAll(AuthenticationFeature.Default, ProfileFeature.Default)
export const UserFeatureTest = Layer.mergeAll(
  AuthenticationFeature.DefaultWithoutDependencies.pipe(Layer.provide([UserAuthenticationTest])),
  ProfileFeature.DefaultWithoutDependencies.pipe(Layer.provide([UserProfileTest]))
)
export const UserFeatureAuto = Layer.unwrap(
  Effect.map(Config.string('NODE_ENV').pipe(Config.withDefault('development')), (environment) =>
    environment === 'test' ? UserFeatureTest : UserFeatureLive
  )
)
