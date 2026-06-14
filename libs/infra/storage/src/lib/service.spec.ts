import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { StorageService } from './service'

/**
 * StorageService Tests
 *
 * Tests actual business behavior of the in-memory Test layer.
 *
 * @module @samuelho-dev/infra-storage
 */

const TestLayer = Layer.fresh(StorageService.Test)

describe('StorageService', () => {
  // ==========================================================================
  // Upload / Download roundtrip
  // ==========================================================================

  describe('upload and download roundtrip', () => {
    it.effect('downloaded content matches what was uploaded (string)', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        yield* svc.upload('bucket', 'hello.txt', 'Hello World')
        const blob = yield* svc.download('bucket', 'hello.txt')
        const text = yield* Effect.promise(() => blob.text())

        expect(text).toBe('Hello World')
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect('downloaded content matches what was uploaded (Blob)', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        const original = new Blob(['binary-ish data'], {
          type: 'application/octet-stream'
        })
        yield* svc.upload('bucket', 'data.bin', original)
        const blob = yield* svc.download('bucket', 'data.bin')
        const text = yield* Effect.promise(() => blob.text())

        expect(text).toBe('binary-ish data')
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect('downloaded content matches what was uploaded (ArrayBuffer)', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        const buf = new TextEncoder().encode('buffer content').buffer
        yield* svc.upload('bucket', 'buf.bin', buf)
        const blob = yield* svc.download('bucket', 'buf.bin')
        const text = yield* Effect.promise(() => blob.text())

        expect(text).toBe('buffer content')
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect('download fails with FileNotFoundError for non-existent path', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        const result = yield* svc.download('bucket', 'nope.txt').pipe(Effect.flip)

        expect(result._tag).toBe('FileNotFoundError')
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect('upload returns correct path, bucket, and publicUrl', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        const result = yield* svc.upload('assets', 'images/photo.jpg', 'img')

        expect(result.path).toBe('images/photo.jpg')
        expect(result.bucket).toBe('assets')
        expect(result.publicUrl).toContain('assets')
        expect(result.publicUrl).toContain('images/photo.jpg')
      }).pipe(Effect.provide(TestLayer))
    )
  })

  // ==========================================================================
  // exists
  // ==========================================================================

  describe('exists', () => {
    it.effect('returns true after uploading a file', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        yield* svc.upload('bucket', 'present.txt', 'data')

        expect(yield* svc.exists('bucket', 'present.txt')).toBe(true)
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect('returns false for a path that was never uploaded', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        expect(yield* svc.exists('bucket', 'absent.txt')).toBe(false)
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect('returns false after removing a file', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        yield* svc.upload('bucket', 'temp.txt', 'data')
        expect(yield* svc.exists('bucket', 'temp.txt')).toBe(true)

        yield* svc.remove('bucket', ['temp.txt'])
        expect(yield* svc.exists('bucket', 'temp.txt')).toBe(false)
      }).pipe(Effect.provide(TestLayer))
    )
  })

  // ==========================================================================
  // remove
  // ==========================================================================

  describe('remove', () => {
    it.effect('removes files so download fails afterwards', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        yield* svc.upload('bucket', 'a.txt', 'aaa')
        yield* svc.upload('bucket', 'b.txt', 'bbb')

        yield* svc.remove('bucket', ['a.txt', 'b.txt'])

        const errA = yield* svc.download('bucket', 'a.txt').pipe(Effect.flip)
        const errB = yield* svc.download('bucket', 'b.txt').pipe(Effect.flip)

        expect(errA._tag).toBe('FileNotFoundError')
        expect(errB._tag).toBe('FileNotFoundError')
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect('does not affect other files in the same bucket', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        yield* svc.upload('bucket', 'keep.txt', 'keeper')
        yield* svc.upload('bucket', 'drop.txt', 'dropper')

        yield* svc.remove('bucket', ['drop.txt'])

        const blob = yield* svc.download('bucket', 'keep.txt')
        const text = yield* Effect.promise(() => blob.text())
        expect(text).toBe('keeper')
      }).pipe(Effect.provide(TestLayer))
    )
  })

  // ==========================================================================
  // move
  // ==========================================================================

  describe('move', () => {
    it.effect('file is accessible at new path and gone from old path', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        yield* svc.upload('bucket', 'old/file.txt', 'moved content')
        yield* svc.move('bucket', 'old/file.txt', 'new/file.txt')

        // available at new path
        const blob = yield* svc.download('bucket', 'new/file.txt')
        const text = yield* Effect.promise(() => blob.text())
        expect(text).toBe('moved content')

        // gone from old path
        const err = yield* svc.download('bucket', 'old/file.txt').pipe(Effect.flip)
        expect(err._tag).toBe('FileNotFoundError')
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect('fails with FileNotFoundError when source does not exist', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        const err = yield* svc.move('bucket', 'ghost.txt', 'dest.txt').pipe(Effect.flip)

        expect(err._tag).toBe('FileNotFoundError')
      }).pipe(Effect.provide(TestLayer))
    )
  })

  // ==========================================================================
  // copy
  // ==========================================================================

  describe('copy', () => {
    it.effect('file is accessible at both old and new paths', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        yield* svc.upload('bucket', 'src.txt', 'copied content')
        yield* svc.copy('bucket', 'src.txt', 'dst.txt')

        const srcBlob = yield* svc.download('bucket', 'src.txt')
        const dstBlob = yield* svc.download('bucket', 'dst.txt')

        expect(yield* Effect.promise(() => srcBlob.text())).toBe('copied content')
        expect(yield* Effect.promise(() => dstBlob.text())).toBe('copied content')
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect('fails with FileNotFoundError when source does not exist', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        const err = yield* svc.copy('bucket', 'ghost.txt', 'dst.txt').pipe(Effect.flip)

        expect(err._tag).toBe('FileNotFoundError')
      }).pipe(Effect.provide(TestLayer))
    )
  })

  // ==========================================================================
  // list
  // ==========================================================================

  describe('list', () => {
    it.effect('lists uploaded files', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        yield* svc.upload('bucket', 'a.txt', 'a')
        yield* svc.upload('bucket', 'b.txt', 'b')

        const result = yield* svc.list('bucket')

        const names = result.files.map((f) => f.name)
        expect(names).toContain('a.txt')
        expect(names).toContain('b.txt')
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect('filters by prefix', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        yield* svc.upload('bucket', 'images/cat.jpg', 'cat')
        yield* svc.upload('bucket', 'images/dog.jpg', 'dog')
        yield* svc.upload('bucket', 'docs/readme.md', 'readme')

        const result = yield* svc.list('bucket', { prefix: 'images/' })

        const names = result.files.map((f) => f.name)
        expect(names).toContain('images/cat.jpg')
        expect(names).toContain('images/dog.jpg')
        expect(names).not.toContain('docs/readme.md')
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect('returns empty for bucket with no files', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        const result = yield* svc.list('empty-bucket')

        expect(result.files).toEqual([])
        expect(result.hasMore).toBe(false)
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect('reflects removals', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        yield* svc.upload('bucket', 'temp.txt', 'data')
        yield* svc.remove('bucket', ['temp.txt'])

        const result = yield* svc.list('bucket')
        const names = result.files.map((f) => f.name)
        expect(names).not.toContain('temp.txt')
      }).pipe(Effect.provide(TestLayer))
    )
  })

  // ==========================================================================
  // signed URLs
  // ==========================================================================

  describe('createSignedUrl', () => {
    it.effect('includes the bucket and path in the URL', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        yield* svc.upload('assets', 'doc.pdf', 'pdf')
        const url = yield* svc.createSignedUrl('assets', 'doc.pdf')

        expect(url).toContain('assets')
        expect(url).toContain('doc.pdf')
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect('different paths produce different URLs', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        yield* svc.upload('b', 'x.txt', 'x')
        yield* svc.upload('b', 'y.txt', 'y')

        const urlX = yield* svc.createSignedUrl('b', 'x.txt')
        const urlY = yield* svc.createSignedUrl('b', 'y.txt')

        expect(urlX).not.toBe(urlY)
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect('returns URL without pre-checking existence (matches Live semantics)', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        // Live layer delegates to Supabase and only surfaces FileNotFoundError
        // if the provider itself 404s. Test layer mirrors that: no pre-check.
        const url = yield* svc.createSignedUrl('b', 'missing.txt')

        expect(url).toContain('b/missing.txt')
      }).pipe(Effect.provide(TestLayer))
    )
  })

  // ==========================================================================
  // public URLs
  // ==========================================================================

  describe('getPublicUrl', () => {
    it.effect('includes bucket and path', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        const url = yield* svc.getPublicUrl('assets', 'images/photo.jpg')

        expect(url).toContain('assets')
        expect(url).toContain('images/photo.jpg')
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect('different paths produce different URLs', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        const urlA = yield* svc.getPublicUrl('b', 'a.txt')
        const urlB = yield* svc.getPublicUrl('b', 'b.txt')

        expect(urlA).not.toBe(urlB)
      }).pipe(Effect.provide(TestLayer))
    )
  })

  // ==========================================================================
  // config
  // ==========================================================================

  describe('config', () => {
    it.effect('exposes signedUrlExpiresIn', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        expect(svc.config.signedUrlExpiresIn).toBe(3600)
      }).pipe(Effect.provide(TestLayer))
    )
  })

  // ==========================================================================
  // bucket isolation
  // ==========================================================================

  describe('bucket isolation', () => {
    it.effect('files in different buckets are independent', () =>
      Effect.gen(function* () {
        const svc = yield* StorageService

        yield* svc.upload('bucket-a', 'file.txt', 'content-a')
        yield* svc.upload('bucket-b', 'file.txt', 'content-b')

        const blobA = yield* svc.download('bucket-a', 'file.txt')
        const blobB = yield* svc.download('bucket-b', 'file.txt')

        expect(yield* Effect.promise(() => blobA.text())).toBe('content-a')
        expect(yield* Effect.promise(() => blobB.text())).toBe('content-b')
      }).pipe(Effect.provide(TestLayer))
    )
  })

  // ==========================================================================
  // Dev layer smoke test
  // ==========================================================================
})
