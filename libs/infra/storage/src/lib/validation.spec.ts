/**
 * Storage validation regression specs.
 *
 * Locks `IMAGE_MIME_TYPES` against accidental SVG re-introduction.
 * SVG → stored XSS via `<script>` / `onload` is the same pattern that
 * burned Statamic (CVE-2026-33172), Langflow (TRA-2026-25), FluentCMS,
 * phpMyFAQ, and Copyparty in 2026. Cf. threat-model.md §3.5 P0.
 *
 * @module @samuelho-dev/infra-storage/validation.spec
 */

import { describe, expect, it } from '@effect/vitest'
import { IMAGE_MIME_TYPES } from './validation'

describe('IMAGE_MIME_TYPES', () => {
  it('does not include image/svg+xml', () => {
    // Hard-fail if SVG ever creeps back in. The MIME constant is the
    // single source of truth — every callsite that copies it (form
    // upload configs, image-input component, text-editor FileHandler)
    // is updated by reading this constant or by being audited against
    // it.
    expect(IMAGE_MIME_TYPES).not.toContain('image/svg+xml')
  })

  it('does not include any svg variant', () => {
    // Defense-in-depth — catch image/svg, image/svg-xml, etc. if a
    // contributor types something close to but not exactly the
    // canonical MIME type.
    for (const mime of IMAGE_MIME_TYPES) {
      expect(mime.toLowerCase()).not.toMatch(/svg/)
    }
  })

  it('still accepts the standard raster formats', () => {
    expect(IMAGE_MIME_TYPES).toContain('image/jpeg')
    expect(IMAGE_MIME_TYPES).toContain('image/png')
    expect(IMAGE_MIME_TYPES).toContain('image/webp')
    expect(IMAGE_MIME_TYPES).toContain('image/gif')
  })
})
