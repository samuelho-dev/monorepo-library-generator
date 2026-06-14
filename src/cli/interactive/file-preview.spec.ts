import { getFilePreview } from "./file-preview"

describe("interactive file preview", () => {
  it("groups nested contract capabilities under top-level subdomains", () => {
    const files = getFilePreview("contract", "form", {
      modules: "form-state,marketing/campaign,marketing/subscriber",
      capabilities: "ports"
    })
    const paths = files.map((file) => file.path)

    expect(paths).toContain("src/lib/form-state/ports.ts")
    expect(paths).toContain("src/lib/marketing/ports.ts")
    expect(paths).not.toContain("src/lib/marketing/campaign/ports.ts")
  })

  it("previews contract RPC as one domain entrypoint", () => {
    const files = getFilePreview("contract", "form", {
      modules: "form-state,marketing/campaign,marketing/subscriber",
      capabilities: "ports,rpc"
    })
    const paths = files.map((file) => file.path)

    expect(paths).toContain("src/lib/rpc.ts")
    expect(paths).not.toContain("src/lib/marketing/rpc.ts")
    expect(paths.some((path) => /rpc-(definitions|errors|group)\.ts$/.test(path))).toBe(false)
  })

  it("previews providers as one root service", () => {
    const files = getFilePreview("provider", "stripe", {})
    const paths = files.map((file) => file.path)

    expect(paths).toContain("src/lib/service.ts")
    expect(paths.some((path) => path.includes("src/lib/stripe/"))).toBe(false)
  })
})
