'use client'
import { UserRpcs } from '@samuelho-dev/contract-user/rpc'
import { AtomRpc, createProtocolLayer } from '@samuelho-dev/infra-rpc/client'
import { Layer } from 'effect'

export class UserRpc extends AtomRpc.Service<UserRpc>()('UserRpc', {
  group: UserRpcs,
  protocol: Layer.suspend(() => createProtocolLayer({ url: '/api/rpc' }))
}) {}
