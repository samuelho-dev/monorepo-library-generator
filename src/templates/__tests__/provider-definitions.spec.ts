/**
 * Provider Template Definition Tests
 *
 * Tests for the declarative provider template definitions.
 */

import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { TemplateCompiler } from "../core/compiler"
import type { TemplateContext, TemplateDefinition } from "../core/types"
import {
  providerErrorsTemplate,
  providerServiceTemplate
} from "../definitions"

/**
 * Compile a template using the Effect service pattern
 */
const compile = (template: TemplateDefinition, ctx: TemplateContext) =>
  Effect.gen(function* () {
    const compiler = yield* TemplateCompiler
    return yield* compiler.compile(template, ctx)
  }).pipe(Effect.provide(TemplateCompiler.Test))

describe("Provider Template Definitions", () => {
  const context: TemplateContext = {
    className: "Stripe",
    fileName: "stripe",
    propertyName: "stripe",
    constantName: "STRIPE",
    scope: "@myorg",
    packageName: "@myorg/provider-stripe",
    projectName: "provider-stripe",
    libraryType: "provider",
    externalService: "Stripe API"
  }

  describe("providerErrorsTemplate", () => {
    it("should have correct metadata", () => {
      expect(providerErrorsTemplate.id).toBe("provider/errors")
      expect(providerErrorsTemplate.meta.title).toBe("{className} Provider Errors")
    })

    it("should compile with all error types", async () => {
      const result = await Effect.runPromise(
        compile(providerErrorsTemplate, context)
      )

      // Check all error types
      expect(result).toContain("class StripeError")
      expect(result).toContain("class StripeNotFoundError")
      expect(result).toContain("class StripeValidationError")
      expect(result).toContain("class StripeRateLimitError")
      expect(result).toContain("class StripeAuthenticationError")
      expect(result).toContain("class StripeAuthorizationError")
      expect(result).toContain("class StripeNetworkError")
      expect(result).toContain("class StripeTimeoutError")
      expect(result).toContain("class StripeInternalError")
    })

    it("should compile with error union type", async () => {
      const result = await Effect.runPromise(
        compile(providerErrorsTemplate, context)
      )

      expect(result).toContain("type StripeServiceError")
      expect(result).toContain("StripeRateLimitError")
      expect(result).toContain("StripeAuthenticationError")
    })

    it("should include Data import", async () => {
      const result = await Effect.runPromise(
        compile(providerErrorsTemplate, context)
      )

      expect(result).toContain('import { Data } from "effect"')
    })

    it("should include rate limit error with retry info", async () => {
      const result = await Effect.runPromise(
        compile(providerErrorsTemplate, context)
      )

      expect(result).toContain("retryAfterMs")
      expect(result).toContain("Rate limit exceeded")
    })
  })

  describe("providerServiceTemplate", () => {
    it("should have correct metadata", () => {
      expect(providerServiceTemplate.id).toBe("provider/service")
      expect(providerServiceTemplate.meta.title).toBe("{className} Service Interface")
    })

    it("should compile with Context.Tag", async () => {
      const result = await Effect.runPromise(
        compile(providerServiceTemplate, context)
      )

      expect(result).toContain("class Stripe extends Context.Tag")
      expect(result).toContain('Context.Tag("Stripe")')
    })

    it("should compile with service interface", async () => {
      const result = await Effect.runPromise(
        compile(providerServiceTemplate, context)
      )

      expect(result).toContain("interface StripeServiceInterface")
      expect(result).toContain("readonly config:")
      expect(result).toContain("readonly healthCheck:")
      expect(result).toContain("readonly list:")
      expect(result).toContain("readonly get:")
      expect(result).toContain("readonly create:")
      expect(result).toContain("readonly update:")
      expect(result).toContain("readonly delete:")
    })

    it("should compile with static layers", async () => {
      const result = await Effect.runPromise(
        compile(providerServiceTemplate, context)
      )

      expect(result).toContain("static readonly Live")
      expect(result).toContain("static readonly Test")
      expect(result).toContain("static readonly Dev")
      expect(result).toContain("static readonly Auto")
    })

    it("should include Effect imports", async () => {
      const result = await Effect.runPromise(
        compile(providerServiceTemplate, context)
      )

      expect(result).toContain('import { Context, Effect, Layer, Redacted } from "effect"')
    })

    it("should include type imports", async () => {
      const result = await Effect.runPromise(
        compile(providerServiceTemplate, context)
      )

      expect(result).toContain("StripeConfig")
      expect(result).toContain("Resource")
      expect(result).toContain("ListParams")
      expect(result).toContain("PaginatedResult")
    })

    it("should include environment config in Live layer", async () => {
      const result = await Effect.runPromise(
        compile(providerServiceTemplate, context)
      )

      expect(result).toContain("STRIPE_API_KEY")
      expect(result).toContain("STRIPE_TIMEOUT")
      expect(result).toContain("Redacted.value")
    })

    it("should include dev layer with logging", async () => {
      const result = await Effect.runPromise(
        compile(providerServiceTemplate, context)
      )

      expect(result).toContain("Effect.logDebug")
      expect(result).toContain("[Stripe] [DEV]")
    })

    it("should include auto layer with environment detection", async () => {
      const result = await Effect.runPromise(
        compile(providerServiceTemplate, context)
      )

      expect(result).toContain("Layer.suspend")
      expect(result).toContain("env.NODE_ENV")
      expect(result).toContain("Stripe.Test")
      expect(result).toContain("Stripe.Dev")
      expect(result).toContain("Stripe.Live")
    })
  })

  describe("Variable interpolation", () => {
    it("should interpolate className in errors template", async () => {
      const twilioContext: TemplateContext = {
        ...context,
        className: "Twilio",
        fileName: "twilio",
        propertyName: "twilio",
        constantName: "TWILIO"
      }

      const result = await Effect.runPromise(
        compile(providerErrorsTemplate, twilioContext)
      )

      expect(result).toContain("TwilioError")
      expect(result).toContain("TwilioNotFoundError")
      expect(result).toContain("TwilioRateLimitError")
      expect(result).toContain("TwilioServiceError")
    })

    it("should interpolate className in service template", async () => {
      const twilioContext: TemplateContext = {
        ...context,
        className: "Twilio",
        fileName: "twilio",
        propertyName: "twilio",
        constantName: "TWILIO"
      }

      const result = await Effect.runPromise(
        compile(providerServiceTemplate, twilioContext)
      )

      expect(result).toContain("class Twilio extends Context.Tag")
      expect(result).toContain("TwilioServiceInterface")
      expect(result).toContain("TWILIO_API_KEY")
      expect(result).toContain("TWILIO_TIMEOUT")
    })

    it("should interpolate scope in imports", async () => {
      const customScopeContext: TemplateContext = {
        ...context,
        scope: "@acme"
      }

      const result = await Effect.runPromise(
        compile(providerServiceTemplate, customScopeContext)
      )

      expect(result).toContain("@acme/env")
    })

    it("should interpolate constantName in env vars", async () => {
      const awsContext: TemplateContext = {
        ...context,
        className: "AwsS3",
        fileName: "aws-s3",
        propertyName: "awsS3",
        constantName: "AWS_S3"
      }

      const result = await Effect.runPromise(
        compile(providerServiceTemplate, awsContext)
      )

      expect(result).toContain("AWS_S3_API_KEY")
      expect(result).toContain("AWS_S3_TIMEOUT")
    })
  })
})
