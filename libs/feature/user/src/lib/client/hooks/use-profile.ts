'use client'
import { useAtomQuery } from '@samuelho-dev/infra-rpc/client'
import { UserRpc } from '../rpc'

export function useProfile(id: string) {
  return useAtomQuery(UserRpc.query('GetProfile', { id }))
}
