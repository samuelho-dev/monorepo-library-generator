import { Config, Context, Effect, Layer } from 'effect'

export class RpcService extends Context.Service<
  RpcService,
  {
    readonly health: () => Effect.Effect<boolean>
  }
>()('@samuelho-dev/infra-rpc/RpcService') {
  static readonly Live = Layer.succeed(RpcService, { health: () => Effect.succeed(true) })
  static readonly Test = Layer.succeed(RpcService, { health: () => Effect.succeed(true) })
  static readonly Auto = Layer.unwrap(
    Effect.map(Config.string('NODE_ENV').pipe(Config.withDefault('development')), (environment) =>
      environment === 'test' ? RpcService.Test : RpcService.Live
    )
  )
}
