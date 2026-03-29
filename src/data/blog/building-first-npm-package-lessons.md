---
title: "Building Your First npm Package — What Nobody Tells You About Shipping Production TypeScript"
description: "Practical lessons from publishing a zero-dependency TypeScript SDK: project structure, testing against real APIs (not mocks), error handling, strict mode, documentation, and the work that comes after the code is done."
pubDatetime: 2026-03-29T00:00:00+05:30
featured: true
tags:
  - npm-package
  - typescript
  - open-source
  - ceph
  - developer-experience
  - testing
---

I built and published [radosgw-admin](https://radosgw-admin.nycanshu.dev) — a TypeScript SDK for managing Ceph Object Storage clusters. Zero dependencies, AWS Signature V4 auth, dual ESM/CJS, 280+ unit tests.

This post isn't about the package itself. It's about the stuff I learned that I wish someone had told me before I started.

## The code is maybe 30% of the work

I had the core API client working in a few days. Request signing, user management, bucket operations — all functional.

Then reality hit. TypeScript declarations that work for both ESM and CJS consumers. CI pipelines that test across Node 18, 20, and 22. npm provenance so people can verify the package wasn't tampered with. A documentation website. Error messages that actually help someone debug at 2am. A CHANGELOG. A CONTRIBUTING guide. A security policy.

The "last mile" from _working code_ to _publishable package_ took longer than writing the code itself. If you're planning to publish something, double whatever timeline you have in your head.

## Zero dependencies is a feature you earn

The RGW Admin API uses AWS Signature V4 for authentication. The obvious move is `npm install aws-sdk` and move on. I wrote the signing myself — about 80 lines using `node:crypto`.

Why? Because zero production dependencies means:

- No supply chain attacks through transitive deps
- No version conflicts with whatever your users already have installed
- No `npm audit` warnings that aren't yours to fix
- No bloated `node_modules` — users install one package and get exactly what they need

It took extra effort. But it's a feature I can put on the box and mean it. When someone evaluates your package, "zero dependencies" is a trust signal.

## Project structure will save you or sink you

Here's something I didn't appreciate early enough: **how you organize your code determines how maintainable it is six months later.**

I started with everything in a few big files. It worked. Then I needed to add bucket quotas, and I had to read through 400 lines to figure out where the change should go.

I refactored into a structure where each domain has its own module:

```
src/
  client/        # HTTP client, request signing
  resources/     # user.ts, bucket.ts, quota.ts, usage.ts
  types/         # All TypeScript interfaces
  errors/        # Custom error classes
  index.ts       # Public API surface
```

Every new feature now has an obvious home. Every bug has a predictable location. If someone opens a PR, they know exactly which file to touch.

**The lesson:** invest in structure early. Not a "clean architecture" astronaut design — just obvious, boring folder organization that a stranger could navigate in 30 seconds.

## Write errors like you're debugging at 2am

Early versions of my SDK threw generic errors: `Error: Request failed`. Completely useless.

Now every error includes:

- What operation was attempted
- What went wrong (HTTP status, API error code)
- What the user can check (credentials, endpoint, permissions)

```typescript
// Bad
throw new Error("Request failed");

// Good
throw new RGWAdminError(
  `Failed to create user "${uid}": ${response.status} ${errorCode}. ` +
  `Check that your access key has admin caps for "users=write".`
);
```

When your library throws an error, the developer using it shouldn't have to read your source code to understand what happened. **The error message is your documentation at the point of failure.**

Custom error classes also let consumers catch specific failure types:

```typescript
try {
  await rgw.createUser({ uid: "test" });
} catch (e) {
  if (e instanceof RGWAdminError) {
    // handle API-specific error
  }
}
```

This one change dramatically reduced the "how do I use this?" questions.

## Test against real services, not mocks

This one burned me and I'll never forget it.

I had 100% mock coverage. Every test passed. I was confident. Then someone tried it against an actual Ceph cluster and half the operations failed — because the real API returns slightly different response shapes than the docs describe.

**Mocks test your assumptions. Integration tests test reality.**

I now run two test suites:

- **Unit tests** — fast, run in CI, mock the HTTP layer. Good for catching regressions and validating logic.
- **Integration tests** — run against a real Ceph RGW instance in Docker. Slow, but they catch the things that actually matter: does this work against a real server?

```bash
# Unit tests (fast, every PR)
npm test

# Integration tests (real Ceph cluster in Docker)
npm run test:integration
```

The integration tests have caught bugs that unit tests never would have found:

- API responses with extra fields not in the docs
- Encoding issues with special characters in user IDs
- Rate limiting behavior that only shows up under real load
- Version differences between Ceph Pacific and Quincy

**If your package talks to an external service, mock tests alone will betray you.** Budget time for integration tests against the real thing, even if it's just a Docker container.

## TypeScript strict mode is pain that pays off

I turned on every strict flag TypeScript has: `noImplicitAny`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `strict: true`.

Writing code was noticeably slower. The compiler complained about things that "obviously work." I almost turned some flags off three different times.

But when I used the package from a consumer's perspective — autocomplete worked perfectly, types matched real API responses, and mistakes showed up before running anything.

Your users don't see your source code. They see autocomplete suggestions and type errors. Strict mode is how you make that experience good.

## Nobody finds your package unless you tell them

There are 2+ million packages on npm. Publishing and hoping for discovery doesn't work.

I actively shared on:

- Reddit (r/node, r/typescript, r/ceph)
- dev.to ([wrote a full article](https://dev.to/okay_anshu/i-built-a-typescript-client-for-ceph-object-storage-because-the-only-npm-package-was-7-years-old-1nh0))
- GitHub Discussions in related projects
- LinkedIn

The dev.to article alone drove more traffic than the npm listing ever did organically. **If you're building open source, marketing is not optional.** Budget real time for it.

## Ship v0.1.0, not v1.0.0

I wanted to keep polishing. Fix one more edge case. Add one more feature. Write one more test.

But the feedback from real users is worth more than another week of solo development.

`v0.1.0` says _"this works, try it, tell me what's missing."_

`v1.0.0` says _"this API is stable and I won't break it."_

I wasn't ready to make that promise. And the feedback I got from early adopters shaped the API in ways I never would have thought of alone.

## Document the why, not just the how

My first docs were pure reference — function signatures, parameter types, return values. Technically complete, practically useless for someone getting started.

What actually helped users:

- A "Getting Started" guide that goes from `npm install` to working code in under a minute
- Real-world examples for common use cases (create user, set quota, list buckets)
- A "Why this package?" section explaining what problem it solves
- Inline code comments explaining _why_ a design decision was made, not what the code does

The [documentation site](https://radosgw-admin.nycanshu.dev) took real effort to build, but it's the single biggest driver of adoption. People judge your package by the docs before they ever read a line of source code.

## Keep a changelog — your future self will thank you

Every release gets a CHANGELOG entry. Not just "bug fixes" — actual descriptions of what changed and why.

```markdown
## [0.4.0] - 2026-03-10
### Added
- Rate limit management (get/set per-user rate limits)
- Usage trimming with date range support

### Fixed
- Bucket stats returning null for empty buckets (Ceph Quincy)

### Changed
- Error messages now include the attempted operation name
```

Six months from now, when someone asks "when did you add rate limit support?" or "did you fix that null bucket stats thing?" — the changelog answers instantly. It's also how you write release notes without having to `git log` through 50 commits.

## The real takeaway

Building a package that works is step one. Building a package that people _want to use_ requires:

- Clean, navigable project structure
- Error messages written for humans
- Tests against real services, not just mocks
- Strict TypeScript for great consumer DX
- Documentation that gets someone from zero to working
- Active promotion — nobody will find it otherwise
- Shipping early and iterating on real feedback

The code is the easy part. Everything around it is what separates a side project from a real tool.

---

If you work with Ceph, Rook-Ceph, or OpenShift Data Foundation and need to manage RGW users, buckets, or quotas from Node.js:

- [Documentation](https://radosgw-admin.nycanshu.dev)
- [GitHub](https://github.com/nycanshu/radosgw-admin)
- [npm](https://www.npmjs.com/package/radosgw-admin)
