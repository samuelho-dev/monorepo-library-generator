import { Config, Context, Effect, Layer } from 'effect'

export class Opentelemetry extends Context.Service<
  Opentelemetry,
  {
    readonly health: () => Effect.Effect<boolean>
  }
>()('@samuelho-dev/provider-opentelemetry/Opentelemetry') {
  static readonly Live = Layer.succeed(Opentelemetry, { health: () => Effect.succeed(true) })
  static readonly Test = Layer.succeed(Opentelemetry, { health: () => Effect.succeed(true) })
  static readonly Auto = Layer.unwrap(
    Effect.map(Config.string('NODE_ENV').pipe(Config.withDefault('development')), (environment) =>
      environment === 'test' ? Opentelemetry.Test : Opentelemetry.Live
    )
  )
}
