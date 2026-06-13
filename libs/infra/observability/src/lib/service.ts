import { Config, Context, Effect, Layer } from 'effect'

export class ObservabilityService extends Context.Service<
  ObservabilityService,
  {
    readonly health: () => Effect.Effect<boolean>
  }
>()('@samuelho-dev/infra-observability/ObservabilityService') {
  static readonly Live = Layer.succeed(ObservabilityService, { health: () => Effect.succeed(true) })
  static readonly Test = Layer.succeed(ObservabilityService, { health: () => Effect.succeed(true) })
  static readonly Auto = Layer.unwrap(
    Effect.map(Config.string('NODE_ENV').pipe(Config.withDefault('development')), (environment) =>
      environment === 'test' ? ObservabilityService.Test : ObservabilityService.Live
    )
  )
}
