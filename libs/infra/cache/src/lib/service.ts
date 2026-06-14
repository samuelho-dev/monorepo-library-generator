import { Config, Context, Effect, Layer } from 'effect'

export class CacheService extends Context.Service<
  CacheService,
  {
    readonly health: () => Effect.Effect<boolean>
  }
>()('@samuelho-dev/infra-cache/CacheService') {
  static readonly Live = Layer.succeed(CacheService, { health: () => Effect.succeed(true) })
  static readonly Test = Layer.succeed(CacheService, { health: () => Effect.succeed(true) })
  static readonly Auto = Layer.unwrap(
    Effect.map(Config.string('NODE_ENV').pipe(Config.withDefault('development')), (environment) =>
      environment === 'test' ? CacheService.Test : CacheService.Live
    )
  )
}
