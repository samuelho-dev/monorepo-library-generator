import { Context, Effect, Layer } from 'effect'

export { SupabaseConnectionError } from './errors'

import { SupabaseConnectionError } from './errors'
import { SupabaseClient } from './service'

export interface SupabaseRealtimeSubscribeParams {
  readonly table: string
  readonly filter?: string | undefined
  readonly event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*' | undefined
  readonly onEvent: () => void
}

export class SupabaseRealtime extends Context.Service<
  SupabaseRealtime,
  {
    readonly subscribeToTableChanges: (
      params: SupabaseRealtimeSubscribeParams
    ) => Effect.Effect<() => void, SupabaseConnectionError>
  }
>()('@samuelho-dev/provider-supabase/SupabaseRealtime') {
  static readonly Live = Layer.effect(
    SupabaseRealtime,
    Effect.gen(function* () {
      const supabaseClient = yield* SupabaseClient
      const client = yield* supabaseClient.getClient()

      return {
        subscribeToTableChanges: ({ table, filter, event = '*', onEvent }) =>
          Effect.try({
            try: () => {
              const channelName = filter ? `realtime:${table}:${filter}` : `realtime:${table}`

              const channel = client
                .channel(channelName)
                .on(
                  'postgres_changes',
                  {
                    event,
                    schema: 'public',
                    table,
                    ...(filter ? { filter } : {})
                  },
                  () => onEvent()
                )
                .subscribe()

              return () => {
                client.removeChannel(channel)
              }
            },
            catch: (error) =>
              new SupabaseConnectionError({
                retryable: true,
                message: 'Failed to subscribe to realtime channel',
                cause: error
              })
          })
      }
    })
  )

  static readonly Test = Layer.succeed(SupabaseRealtime, {
    subscribeToTableChanges: () => Effect.succeed(() => undefined)
  })
}
