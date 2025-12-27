/**
 * User CQRS Projections Index
 *
 * Barrel export for CQRS projections.
 *
 * @module @samuelho-dev/feature-user/server/cqrs/projections
 */

export { UserProjectionBuilder } from "./builder"

export type {
  ProjectionBuilderInterface,
  ProjectionDefinition,
  ProjectionHandler,
  ReadModelStore,
  UserReadModel
} from "./builder"
