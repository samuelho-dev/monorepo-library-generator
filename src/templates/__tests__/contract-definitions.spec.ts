/**
 * Contract Template Definition Tests
 *
 * Tests for the declarative contract template definitions.
 */

import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { TemplateCompiler } from "../core/compiler"
import type { TemplateContext, TemplateDefinition } from "../core/types"
import {
  contractErrorsTemplate,
  contractEventsTemplate,
  contractPortsTemplate
} from "../definitions"

/**
 * Compile a template using the Effect service pattern
 */
const compile = (template: TemplateDefinition, ctx: TemplateContext) =>
  Effect.gen(function* () {
    const compiler = yield* TemplateCompiler
    return yield* compiler.compile(template, ctx)
  }).pipe(Effect.provide(TemplateCompiler.Test))

describe("Contract Template Definitions", () => {
  const context: TemplateContext = {
    className: "User",
    fileName: "user",
    propertyName: "user",
    constantName: "USER",
    scope: "@myorg",
    packageName: "@myorg/contract-user",
    projectName: "contract-user",
    libraryType: "contract",
    entityTypeSource: "./types/database"
  }

  describe("contractErrorsTemplate", () => {
    it("should have correct metadata", () => {
      expect(contractErrorsTemplate.id).toBe("contract/errors")
      expect(contractErrorsTemplate.meta.title).toBe("{className} Domain Errors")
    })

    it("should compile with domain errors", async () => {
      const result = await Effect.runPromise(
        compile(contractErrorsTemplate, context)
      )

      // Check domain errors
      expect(result).toContain("class UserNotFoundError")
      expect(result).toContain("class UserValidationError")
      expect(result).toContain("class UserAlreadyExistsError")
      expect(result).toContain("class UserPermissionError")

      // Check domain error union
      expect(result).toContain("type UserDomainError")
    })

    it("should compile with repository errors", async () => {
      const result = await Effect.runPromise(
        compile(contractErrorsTemplate, context)
      )

      // Check repository errors
      expect(result).toContain("class UserNotFoundRepositoryError")
      expect(result).toContain("class UserValidationRepositoryError")
      expect(result).toContain("class UserConflictRepositoryError")
      expect(result).toContain("class UserDatabaseRepositoryError")

      // Check repository error union
      expect(result).toContain("type UserRepositoryError")
    })

    it("should compile with combined error type", async () => {
      const result = await Effect.runPromise(
        compile(contractErrorsTemplate, context)
      )

      expect(result).toContain("type UserError = UserDomainError | UserRepositoryError")
    })

    it("should include Data import", async () => {
      const result = await Effect.runPromise(
        compile(contractErrorsTemplate, context)
      )

      expect(result).toContain('import { Data } from "effect"')
    })
  })

  describe("contractPortsTemplate", () => {
    it("should have correct metadata", () => {
      expect(contractPortsTemplate.id).toBe("contract/ports")
      expect(contractPortsTemplate.meta.title).toBe("{className} Ports (Interfaces)")
    })

    it("should compile with supporting types", async () => {
      const result = await Effect.runPromise(
        compile(contractPortsTemplate, context)
      )

      expect(result).toContain("interface UserFilters")
      expect(result).toContain("interface OffsetPaginationParams")
      expect(result).toContain("interface SortOptions")
      expect(result).toContain("interface PaginatedResult<T>")
    })

    it("should compile with repository port", async () => {
      const result = await Effect.runPromise(
        compile(contractPortsTemplate, context)
      )

      expect(result).toContain("class UserRepository")
      expect(result).toContain("Context.Tag")
      expect(result).toContain("@myorg/contract-user/UserRepository")
      expect(result).toContain("readonly findById")
      expect(result).toContain("readonly findAll")
      expect(result).toContain("readonly create")
      expect(result).toContain("readonly update")
      expect(result).toContain("readonly delete")
      expect(result).toContain("readonly exists")
    })

    it("should compile with service port", async () => {
      const result = await Effect.runPromise(
        compile(contractPortsTemplate, context)
      )

      expect(result).toContain("class UserService")
      expect(result).toContain("readonly get")
      expect(result).toContain("readonly list")
    })

    it("should include Context import", async () => {
      const result = await Effect.runPromise(
        compile(contractPortsTemplate, context)
      )

      expect(result).toContain('import { Context } from "effect"')
    })

    it("should include CQRS projection when enabled", async () => {
      const result = await Effect.runPromise(
        compile(contractPortsTemplate, { ...context, includeCQRS: true })
      )

      expect(result).toContain("class UserProjectionRepository")
      expect(result).toContain("readonly findProjection")
      expect(result).toContain("readonly listProjections")
    })

    it("should not include CQRS projection when disabled", async () => {
      const result = await Effect.runPromise(
        compile(contractPortsTemplate, { ...context, includeCQRS: false })
      )

      expect(result).not.toContain("class UserProjectionRepository")
    })
  })

  describe("contractEventsTemplate", () => {
    it("should have correct metadata", () => {
      expect(contractEventsTemplate.id).toBe("contract/events")
      expect(contractEventsTemplate.meta.title).toBe("{className} Domain Events")
    })

    it("should compile with event metadata", async () => {
      const result = await Effect.runPromise(
        compile(contractEventsTemplate, context)
      )

      expect(result).toContain("const EventMetadata")
      expect(result).toContain("eventId")
      expect(result).toContain("eventType")
      expect(result).toContain("correlationId")
    })

    it("should compile with aggregate metadata", async () => {
      const result = await Effect.runPromise(
        compile(contractEventsTemplate, context)
      )

      expect(result).toContain("const UserAggregateMetadata")
      expect(result).toContain("aggregateId")
      expect(result).toContain("aggregateVersion")
    })

    it("should compile with domain events", async () => {
      const result = await Effect.runPromise(
        compile(contractEventsTemplate, context)
      )

      expect(result).toContain("class UserCreatedEvent")
      expect(result).toContain("class UserUpdatedEvent")
      expect(result).toContain("class UserDeletedEvent")
    })

    it("should compile with event union type", async () => {
      const result = await Effect.runPromise(
        compile(contractEventsTemplate, context)
      )

      expect(result).toContain("type UserEvent")
      expect(result).toContain("UserCreatedEvent")
      expect(result).toContain("UserUpdatedEvent")
      expect(result).toContain("UserDeletedEvent")
    })

    it("should compile with event factory helpers", async () => {
      const result = await Effect.runPromise(
        compile(contractEventsTemplate, context)
      )

      expect(result).toContain("function createEventMetadata")
      expect(result).toContain("function createAggregateMetadata")
    })

    it("should include Schema import", async () => {
      const result = await Effect.runPromise(
        compile(contractEventsTemplate, context)
      )

      expect(result).toContain('import { Schema } from "effect"')
    })
  })

  describe("Variable interpolation", () => {
    it("should interpolate className in all templates", async () => {
      const orderContext: TemplateContext = {
        ...context,
        className: "Order",
        fileName: "order",
        propertyName: "order"
      }

      const errorsResult = await Effect.runPromise(
        compile(contractErrorsTemplate, orderContext)
      )
      expect(errorsResult).toContain("OrderNotFoundError")
      expect(errorsResult).toContain("OrderValidationError")

      const portsResult = await Effect.runPromise(
        compile(contractPortsTemplate, orderContext)
      )
      expect(portsResult).toContain("OrderRepository")
      expect(portsResult).toContain("OrderService")

      const eventsResult = await Effect.runPromise(
        compile(contractEventsTemplate, orderContext)
      )
      expect(eventsResult).toContain("OrderCreatedEvent")
      expect(eventsResult).toContain("OrderUpdatedEvent")
    })
  })
})
