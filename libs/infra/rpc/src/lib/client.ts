'use client'

import { useAtomMount, useAtomRefresh, useAtomValue } from '@effect/atom-react'
import { Layer, Option } from 'effect'
import { FetchHttpClient } from 'effect/unstable/http'
import * as AsyncResult from 'effect/unstable/reactivity/AsyncResult'
import type * as Atom from 'effect/unstable/reactivity/Atom'
import * as AtomRpc from 'effect/unstable/reactivity/AtomRpc'
import { RpcClient, RpcSerialization } from 'effect/unstable/rpc'
import { useMemo } from 'react'

export { AtomRpc }

export interface ProtocolConfig {
  readonly url: string
}

export interface AtomQueryResult<A, E> {
  readonly data: A | undefined
  readonly error: E | undefined
  readonly isError: boolean
  readonly isLoading: boolean
  readonly isSuccess: boolean
  readonly refetch: () => void
}

export function createProtocolLayer(config: ProtocolConfig) {
  return RpcClient.layerProtocolHttp({ url: config.url }).pipe(
    Layer.provide(Layer.mergeAll(FetchHttpClient.layer, RpcSerialization.layerJson))
  )
}

export function useAtomQuery<A, E>(
  atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>
): AtomQueryResult<A, E> {
  useAtomMount(atom)
  const result = useAtomValue(atom)
  const refetch = useAtomRefresh(atom)

  return useMemo(() => {
    const isLoading = AsyncResult.isWaiting(result)
    if (AsyncResult.isSuccess(result)) {
      return {
        data: result.value,
        error: undefined,
        isError: false,
        isLoading,
        isSuccess: true,
        refetch
      }
    }
    if (AsyncResult.isFailure(result)) {
      return {
        data: undefined,
        error: Option.getOrUndefined(AsyncResult.error(result)),
        isError: true,
        isLoading,
        isSuccess: false,
        refetch
      }
    }
    return {
      data: undefined,
      error: undefined,
      isError: false,
      isLoading,
      isSuccess: false,
      refetch
    }
  }, [refetch, result])
}
