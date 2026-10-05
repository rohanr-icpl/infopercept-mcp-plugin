import type { Practice } from "./types.js";

export const nextPractices: Practice[] = [
  {
    id: "next-server-vs-client",
    category: "nextjs",
    title: "Server Components by default, Client Components at the leaves",
    summary: "In the App Router every component is a Server Component unless marked `\"use client\"`. Push the client boundary as low as possible.",
    do: [
      "Keep pages/layouts as Server Components; fetch data there",
      "Add `\"use client\"` only for state, effects, event handlers, browser APIs or client-only libs",
      "Extract small interactive islands (`<LikeButton />`) rather than making a whole page client-side",
      "Pass Server Components as `children` to Client Components to keep them on the server",
      "Use `import \"server-only\"` in modules that must never reach the browser",
    ],
    dont: [
      "Put `\"use client\"` at the top of a layout or page 'just in case'",
      "Make Client Components `async`",
      "Pass non-serializable props (functions, class instances) from server to client",
      "Import server-only code (DB clients, secrets) into Client Components",
    ],
    good: `// app/products/page.tsx (Server Component)
import { getProducts } from "@/lib/data";
import { AddToCart } from "./add-to-cart"; // small client island

export default async function Page() {
  const products = await getProducts();
  return products.map(p => <li key={p.id}>{p.name}<AddToCart id={p.id} /></li>);
}`,
    bad: `"use client";
export default function Page() {
  const [products, setProducts] = useState([]);
  useEffect(() => { fetch("/api/products").then(...) }, []);
  ...
}`,
    tags: ["rsc", "server components", "client components", "use client", "boundary", "app router"],
  },
  {
    id: "next-data-fetching",
    category: "nextjs",
    title: "Data fetching and caching",
    summary: "Fetch on the server, in parallel, close to where the data is used; be explicit about caching and revalidation.",
    do: [
      "Fetch directly in Server Components with `async/await` (call your DB/service layer directly, no self-API calls)",
      "Run independent requests in parallel with `Promise.all`; stream the slow ones with `<Suspense>`",
      "Be explicit about caching for your Next.js version (`cache` option / `revalidate` / `use cache` + `cacheLife` / `cacheTag`)",
      "Revalidate on mutation with `revalidatePath` / `revalidateTag` (or `updateTag` in Server Actions)",
      "Deduplicate non-fetch data access within a request with React `cache()`",
      "Create a typed data-access layer (`lib/data/*`) that performs authorization checks",
    ],
    dont: [
      "Create waterfalls (await A then await B when independent)",
      "Call your own Route Handler from a Server Component",
      "Rely on implicit caching defaults — they changed between Next.js 14, 15 and 16; verify for your version",
      "Fetch in Client Components when the server could do it",
    ],
    good: `const [user, posts] = await Promise.all([getUser(id), getPosts(id)]);`,
    bad: `const user = await getUser(id);
const posts = await getPosts(id); // waterfall`,
    tags: ["fetch", "cache", "revalidate", "waterfall", "suspense", "streaming", "use cache", "isr"],
  },
  {
    id: "next-server-actions",
    category: "security",
    title: "Server Actions and Route Handlers are public endpoints",
    summary: "Treat every Server Action and Route Handler as a public HTTP API: authenticate, authorise, validate and rate-limit.",
    do: [
      "Mark actions with `\"use server\"` in dedicated files (`actions.ts`)",
      "Validate ALL inputs with Zod on the server, even if the client validated",
      "Check the session and permissions inside every action (not just in the UI)",
      "Return typed results (`{ ok: true } | { ok: false, errors }`) instead of throwing for expected failures",
      "Call `revalidatePath`/`revalidateTag` (and `redirect`) after mutations",
      "Use Server Actions for mutations; use Route Handlers for webhooks, third-party consumers and non-UI clients",
      "Add rate limiting on sensitive endpoints (login, OTP, payments)",
    ],
    dont: [
      "Assume an action is safe because it's not linked in the UI",
      "Trust IDs or roles coming from the client",
      "Return raw database errors or stack traces to the client",
      "Use Server Actions for data reads",
    ],
    good: `"use server";
import { z } from "zod";
const Schema = z.object({ title: z.string().min(1).max(120) });

export async function createPost(_: unknown, formData: FormData) {
  const session = await auth();
  if (!session) return { ok: false as const, errors: { form: "Unauthorized" } };
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  await db.post.create({ data: { ...parsed.data, authorId: session.user.id } });
  revalidatePath("/posts");
  return { ok: true as const };
}`,
    tags: ["server actions", "route handlers", "validation", "auth", "zod", "security", "mutation"],
  },
  {
    id: "next-file-conventions",
    category: "nextjs",
    title: "App Router file conventions",
    summary: "Use the special files to get streaming, error isolation and consistent UX for free.",
    do: [
      "`layout.tsx` for shared UI (root layout owns `<html>` and `<body>`)",
      "`loading.tsx` for instant loading states (Suspense boundary per segment)",
      "`error.tsx` (Client Component) for segment error UI with a reset button; `global-error.tsx` for root failures",
      "`not-found.tsx` + call `notFound()` for missing resources",
      "Route groups `(marketing)`/`(app)` to organise without affecting URLs; `_folder` for private folders",
      "Parallel and intercepting routes for modals",
      "`generateStaticParams` for known dynamic routes",
    ],
    dont: [
      "Put non-route files in `app/` without underscore/colocation intent",
      "Forget `error.tsx` for data-heavy segments",
      "Nest deeply when a route group would do",
    ],
    tags: ["app router", "layout", "loading", "error", "not-found", "route groups", "parallel routes", "file conventions"],
  },
  {
    id: "next-metadata-seo",
    category: "nextjs",
    title: "Metadata and SEO",
    summary: "Use the Metadata API instead of hand-writing head tags.",
    do: [
      "Export `metadata` (static) or `generateMetadata` (dynamic) from layouts and pages",
      "Set `title.template`, `description`, `openGraph`, `twitter`, `alternates.canonical`",
      "Generate `sitemap.ts`, `robots.ts` and dynamic OG images (`opengraph-image.tsx`)",
      "Add JSON-LD structured data for articles, products and breadcrumbs",
      "Use semantic headings — one `<h1>` per page",
    ],
    dont: ["Manually add `<head>` tags in the App Router", "Duplicate titles/descriptions across pages", "Block indexing accidentally in production"],
    good: `export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return { title: post.title, description: post.summary, alternates: { canonical: \`/blog/\${slug}\` } };
}`,
    tags: ["seo", "metadata", "opengraph", "sitemap", "robots", "json-ld"],
  },
  {
    id: "next-assets",
    category: "performance",
    title: "Images, fonts and scripts",
    summary: "Use Next.js built-ins to hit Core Web Vitals (LCP, CLS, INP).",
    do: [
      "Use `next/image` with explicit `width`/`height` (or `fill` + sized parent) and `sizes`",
      "Add `priority` (or `preload`) only to the LCP image",
      "Use `next/font` (self-hosted, zero layout shift) with `display: 'swap'`",
      "Use `next/script` with `strategy=\"afterInteractive\"` / `\"lazyOnload\"` for third-party scripts",
      "Configure `images.remotePatterns` narrowly",
      "Use `next/link` for internal navigation (prefetching, client transitions)",
    ],
    dont: ["Use raw `<img>` for content images", "Load Google Fonts via `<link>` tags", "Put `priority` on every image", "Use `<a href>` for internal routes"],
    good: `<Image src={hero} alt="Product dashboard" priority sizes="(min-width: 768px) 50vw, 100vw" />`,
    bad: `<img src="/hero.png" />`,
    tags: ["image", "font", "script", "lcp", "cls", "web vitals", "link"],
  },
  {
    id: "next-security",
    category: "security",
    title: "Security and environment variables",
    summary: "Keep secrets on the server, harden headers, and never trust the client.",
    do: [
      "Only `NEXT_PUBLIC_*` variables reach the browser — never put secrets there",
      "Validate env at startup with a Zod schema (`env.ts`)",
      "Enforce auth in a data-access layer AND in middleware/proxy — middleware alone is not sufficient",
      "Set security headers: CSP (with nonces), HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors",
      "Use httpOnly + Secure + SameSite cookies for sessions (Auth.js, Clerk, Better Auth, etc.)",
      "Sanitise any HTML before rendering (DOMPurify) and keep dependencies patched — update Next.js promptly for security advisories",
    ],
    dont: [
      "Use `dangerouslySetInnerHTML` with unsanitised content",
      "Store tokens in `localStorage`",
      "Log secrets or PII",
      "Rely on hiding UI elements as authorisation",
    ],
    tags: ["security", "env", "csp", "headers", "auth", "cookies", "xss", "middleware", "proxy"],
  },
  {
    id: "next-rendering-strategy",
    category: "nextjs",
    title: "Choose the right rendering strategy",
    summary: "Static where possible, dynamic where necessary, streamed where slow.",
    do: [
      "Static rendering for marketing/content pages (+ ISR / tag-based revalidation)",
      "Dynamic rendering only for per-request data (cookies, headers, searchParams)",
      "Partial Prerendering / `use cache` (where available) to mix static shell + dynamic holes",
      "Stream slow sections with Suspense so the shell renders instantly",
      "Use `next build` output to verify which routes are static (○) vs dynamic (ƒ)",
    ],
    dont: ["Read `cookies()`/`headers()` in a root layout (makes everything dynamic)", "Force dynamic rendering globally", "Use client-side fetching for SEO-critical content"],
    tags: ["ssr", "ssg", "isr", "ppr", "static", "dynamic", "streaming", "rendering"],
  },
  {
    id: "next-project-structure",
    category: "nextjs",
    title: "Recommended Next.js project structure",
    summary: "Keep `app/` for routing and colocate feature code outside or next to routes.",
    do: [
      "`src/app` for routes only (thin pages that compose feature components)",
      "`src/features/<feature>` for components, actions, queries and schemas",
      "`src/components/ui` for design-system primitives (shadcn/ui, Radix)",
      "`src/lib` for db, auth, env, utils; `src/lib/data` for data-access functions",
      "Colocate `actions.ts`, `schema.ts` and `_components/` inside route segments when only used there",
      "Use `middleware.ts` (`proxy.ts` in Next 16) only for cheap, edge-safe checks (redirects, locale, auth gate)",
    ],
    dont: ["Grow a monolithic `components/` folder", "Put business logic in page files", "Do heavy work or DB calls in middleware"],
    good: `src/
  app/(app)/dashboard/page.tsx
  features/orders/{components,actions.ts,queries.ts,schema.ts}
  components/ui/
  lib/{db.ts,auth.ts,env.ts,data/}`,
    tags: ["structure", "folders", "architecture", "colocation", "middleware"],
  },
  {
    id: "next-styling",
    category: "nextjs",
    title: "Styling",
    summary: "Prefer zero-runtime styling that works with Server Components.",
    do: [
      "Tailwind CSS or CSS Modules — both work with RSC and have no runtime cost",
      "Use design tokens via CSS variables; support dark mode with `prefers-color-scheme` / class strategy",
      "Use `cva`/`tailwind-variants` + `clsx`/`tailwind-merge` for component variants",
      "Build on accessible primitives (Radix, shadcn/ui, React Aria)",
    ],
    dont: ["Use runtime CSS-in-JS (styled-components, Emotion) in Server Components", "Scatter magic numbers and hard-coded colours"],
    tags: ["css", "tailwind", "styling", "css modules", "tokens", "dark mode"],
  },
  {
    id: "next-tooling-quality",
    category: "testing",
    title: "Tooling and quality gates",
    summary: "Automate consistency so reviews focus on design and logic.",
    do: [
      "TypeScript `strict`, ESLint (`eslint-config-next`, jsx-a11y, react-hooks) and Prettier",
      "Husky + lint-staged for pre-commit; CI runs typecheck, lint, test, build",
      "Turbopack for dev; `next build` in CI to catch static/dynamic surprises",
      "Add `@next/bundle-analyzer`, Lighthouse CI and Web Vitals reporting (`useReportWebVitals`)",
      "Error monitoring (Sentry) and OpenTelemetry instrumentation (`instrumentation.ts`)",
      "Storybook or Ladle for UI components; Playwright for E2E",
    ],
    dont: ["Merge with failing type-check", "Ignore build warnings about dynamic usage", "Skip Core Web Vitals monitoring in production"],
    tags: ["eslint", "prettier", "ci", "husky", "monitoring", "sentry", "vitals"],
  },
];
