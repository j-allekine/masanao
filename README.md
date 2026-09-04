# Masanao

## Getting Started

Masanao is a Next.js application for municipal-kitchen operations. Use the
repository's supported Node.js and pnpm versions when setting up a clone or
worktree.

### Supported development runtimes

- Node.js 22.x is the Linux CI baseline.
- Node.js 24.x is supported and is the Windows verification target.
- pnpm 11.13.1 is the supported package manager (`package.json` is
  authoritative).

For the Windows native-module setup, including the normal prebuilt path and
the optional source-build fallback, see
[Development setup](docs/development-setup.md).

### Install and run

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see
the result.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
