import { Schema } from 'effect'
import { Rpc, RpcGroup } from 'effect/unstable/rpc'

export const AuthenticationRpcInput = Schema.Struct({ id: Schema.String })

export type AuthenticationRpcInput = typeof AuthenticationRpcInput.Type

export const AuthenticationRpcOutput = Schema.Struct({ id: Schema.String })

export type AuthenticationRpcOutput = typeof AuthenticationRpcOutput.Type

export class AuthenticationNotFoundRpcError extends Schema.TaggedErrorClass<AuthenticationNotFoundRpcError>()(
  'AuthenticationNotFoundRpcError',
  {
    message: Schema.String,
    id: Schema.String
  }
) {}

export class GetAuthentication extends Rpc.make('GetAuthentication', {
  payload: AuthenticationRpcInput,
  success: AuthenticationRpcOutput,
  error: AuthenticationNotFoundRpcError
}) {}

export const ProfileRpcInput = Schema.Struct({ id: Schema.String })

export type ProfileRpcInput = typeof ProfileRpcInput.Type

export const ProfileRpcOutput = Schema.Struct({ id: Schema.String })

export type ProfileRpcOutput = typeof ProfileRpcOutput.Type

export class ProfileNotFoundRpcError extends Schema.TaggedErrorClass<ProfileNotFoundRpcError>()(
  'ProfileNotFoundRpcError',
  {
    message: Schema.String,
    id: Schema.String
  }
) {}

export class GetProfile extends Rpc.make('GetProfile', {
  payload: ProfileRpcInput,
  success: ProfileRpcOutput,
  error: ProfileNotFoundRpcError
}) {}

export class UserRpcs extends RpcGroup.make(GetAuthentication, GetProfile) {}
