import { UserService } from "./service"
import { env } from "@myorg/env"
import { Layer } from "effect"

/**
 * User Layers
 *
 * Layer composition for user feature.
Provides different layer implementations for different environments.
 *
 */


/**
 * Live layer for production
 *
 * Pre-wired with UserRepository dependency.
 * Requires repository layer to be provided.
 */
export const UserServiceLive = UserService.Live;

/**
 * Full layer for production
 *
 * Includes all dependencies (Repository, DatabaseService).
 */
export const UserServiceLayer = UserService.Layer;

/**
 * Test layer for testing
 *
 * Uses DatabaseService.Test for in-memory database.
 */
export const UserServiceTestLayer = UserService.TestLayer;

/**
 * Auto layer - automatically selects based on NODE_ENV
 */
export const UserServiceAuto = Layer.suspend(() => {
  switch (env.NODE_ENV) {
    case "test":
      return UserServiceTestLayer;
    default:
      return UserServiceLayer;
  }
});
