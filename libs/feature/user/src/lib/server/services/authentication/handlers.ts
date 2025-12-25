import { Effect } from "effect"

/**
 * Authentication RPC Handlers
 *
 * Handler implementations for authentication RPC operations.

Contract-First Architecture:
- RPC definitions imported from @@samuelho-dev/contract-user (authentication sub-module)
- Handlers implement the RPC interface using the AuthenticationService
- Middleware (auth, service-auth, request-meta) is applied automatically
  based on RouteTag defined in the contract
 *
 */


// ============================================================================
// Contract Imports
// ============================================================================

import { Authentication } from "@samuelho-dev/contract-user";

// ============================================================================
// Infrastructure Imports
// ============================================================================

import {
  RequestMeta,
  getHandlerContext,
} from "@samuelho-dev/infra-rpc";

// ============================================================================
// Service Import
// ============================================================================

import { AuthenticationService } from "./service";

// ============================================================================
// Handler Implementations
// ============================================================================

/**
 * Authentication RPC Handler Implementations
 *
 * Generic CRUD handlers for authentication operations.
 * Handler keys must match RPC operation names exactly (e.g., "Authentication.Get").
 */
export const AuthenticationHandlers = Authentication.AuthenticationRpcs.toLayer({
  /**
   * Get by ID
   * RouteTag: "public" - No authentication required
   */
  "Authentication.Get": ({ id }) =>
    Effect.gen(function*() {
      const meta = yield* RequestMeta;
      const service = yield* AuthenticationService;

      yield* Effect.logDebug("Getting authentication", {
        id,
        requestId: meta.requestId,
      });

      return yield* service.findById(id);
    }),

  /**
   * List with pagination
   * RouteTag: "public" - No authentication required
   */
  "Authentication.List": ({ page, pageSize }) =>
    Effect.gen(function*() {
      const service = yield* AuthenticationService;

      return yield* service.findMany({
        page: page ?? 1,
        pageSize: pageSize ?? 20,
      });
    }),

  /**
   * Create new
   * RouteTag: "protected" - User authentication required
   */
  "Authentication.Create": (input) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* AuthenticationService;

      yield* Effect.logInfo("Creating authentication", {
        userId: user.id,
        requestId: meta.requestId,
      });

      return yield* service.create({
        ...input,
        createdBy: user.id,
      });
    }),

  /**
   * Update existing
   * RouteTag: "protected" - User authentication required
   */
  "Authentication.Update": ({ id, data }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* AuthenticationService;

      yield* Effect.logInfo("Updating authentication", {
        id,
        userId: user.id,
        requestId: meta.requestId,
      });

      return yield* service.update(id, {
        ...data,
        updatedBy: user.id,
      });
    }),

  /**
   * Delete
   * RouteTag: "protected" - User authentication required
   */
  "Authentication.Delete": ({ id }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* AuthenticationService;

      yield* Effect.logInfo("Deleting authentication", {
        id,
        userId: user.id,
        requestId: meta.requestId,
      });

      return yield* service.delete(id);
    }),
});
