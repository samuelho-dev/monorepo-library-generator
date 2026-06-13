import { env } from '@samuelho-dev/env'
import {
  type SupabaseConnectionError,
  SupabaseRealtime,
  type SupabaseRealtimeSubscribeParams
} from '@samuelho-dev/provider-supabase/realtime'
import { Context, Effect, Layer } from 'effect'

export class RealtimeService extends Context.Service<
  RealtimeService,
  {
    readonly subscribeToTableChanges: (
      params: SupabaseRealtimeSubscribeParams
    ) => Effect.Effect<() => void, SupabaseConnectionError>
  }
>()('@samuelho-dev/infra-database/RealtimeService') {
  static readonly Live = Layer.effect(
    RealtimeService,
    Effect.gen(function* () {
      const realtime = yield* SupabaseRealtime
      return {
        subscribeToTableChanges: realtime.subscribeToTableChanges
      }
    })
  )

  static readonly Test = Layer.succeed(RealtimeService, {
    subscribeToTableChanges: () => Effect.succeed(() => undefined)
  })

  static readonly Auto = Layer.suspend(() =>
    env.NODE_ENV === 'test' ? RealtimeService.Test : RealtimeService.Live
  )
}
