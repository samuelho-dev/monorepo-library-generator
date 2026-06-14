import { Config, Context, Effect, Layer } from 'effect'

export class Redis extends Context.Service<
  Redis,
  {
    readonly health: () => Effect.Effect<boolean>
  }
>()('@samuelho-dev/provider-redis/Redis') {
  static readonly Live = Layer.succeed(Redis, { health: () => Effect.succeed(true) })
  static readonly Test = Layer.succeed(Redis, { health: () => Effect.succeed(true) })
  static readonly Auto = Layer.unwrap(
    Effect.map(Config.string('NODE_ENV').pipe(Config.withDefault('development')), (environment) =>
      environment === 'test' ? Redis.Test : Redis.Live
    )
  )
}
