import { Config, Context, Effect, Layer } from 'effect'

export class PubsubService extends Context.Service<
  PubsubService,
  {
    readonly health: () => Effect.Effect<boolean>
  }
>()('@samuelho-dev/infra-pubsub/PubsubService') {
  static readonly Live = Layer.succeed(PubsubService, { health: () => Effect.succeed(true) })
  static readonly Test = Layer.succeed(PubsubService, { health: () => Effect.succeed(true) })
  static readonly Auto = Layer.unwrap(
    Effect.map(Config.string('NODE_ENV').pipe(Config.withDefault('development')), (environment) =>
      environment === 'test' ? PubsubService.Test : PubsubService.Live
    )
  )
}
