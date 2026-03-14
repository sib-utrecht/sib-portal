# sib-portal

Member portal for SIB Utrecht.

## Deployment

The `main` branch is deployed at **[portal.sib-utrecht.nl](https://portal.sib-utrecht.nl)**.

Every branch is automatically deployed to its own preview URL:

```
https://portal.sib-utrecht.nl/versions/<branch-slug>/
```

For example, a branch named `my-feature` is available at `portal.sib-utrecht.nl/versions/my-feature/`.

For the old portal, go to [app.sib-utrecht.nl](https://app.sib-utrecht.nl).

## Tech stack

- [Next.js](https://nextjs.org) — React 19, TypeScript
- [Convex](https://convex.dev) — backend / database
- [AWS Cognito](https://aws.amazon.com/cognito/) — authentication
- [Tailwind CSS](https://tailwindcss.com) v4 + [Radix UI](https://www.radix-ui.com) — styling & components

## Development

Install dependencies and start the dev server:

```bash
pnpm install
pnpm dev
```

## CI / GitHub Pages

Deployments are handled by [`.github/workflows/pages.yml`](.github/workflows/pages.yml):

- Pushing to `main` deploys to the root of `portal.sib-utrecht.nl`.
- Pushing to any other branch deploys to `portal.sib-utrecht.nl/versions/<branch-slug>/`, preserving all other branch deployments on the `gh-pages` branch.
