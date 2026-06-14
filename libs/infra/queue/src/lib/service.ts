import { Config, Context, Effect, Layer } from 'effect'

export class QueueService extends Context.Service<
  QueueService,
  {
    readonly health: () => Effect.Effect<boolean>
  }
>()('@samuelho-dev/infra-queue/QueueService') {
  static readonly Live = Layer.succeed(QueueService, { health: () => Effect.succeed(true) })
  static readonly Test = Layer.succeed(QueueService, { health: () => Effect.succeed(true) })
  static readonly Auto = Layer.unwrap(
    Effect.map(Config.string('NODE_ENV').pipe(Config.withDefault('development')), (environment) =>
      environment === 'test' ? QueueService.Test : QueueService.Live
    )
  )
}
