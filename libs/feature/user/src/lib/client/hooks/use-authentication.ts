'use client'
import { useAtomQuery } from '@samuelho-dev/infra-rpc/client'
import { UserRpc } from '../rpc'

export function useAuthentication(id: string) {
  return useAtomQuery(UserRpc.query('GetAuthentication', { id }))
}
