import type { Practice } from "./types.js";

export const reactPractices: Practice[] = [
  {
    id: "react-composition",
    category: "react",
    title: "Prefer composition over configuration",
    summary: "Build small, focused components and compose them with children/slots instead of adding boolean props for every variation.",
    do: [
      "Keep components single-purpose and under ~150 lines",
      "Use `children` and slot props (`header`, `footer`) for flexible layouts",
      "Use compound components (Tabs, Tabs.List, Tabs.Panel) for complex widgets",
      "Extend native elements with `ComponentProps<'button'>` and spread the rest props",
    ],
    dont: [
      "Add `isX`/`hasY` boolean flags until a component has 6+ props",
      "Pass down props through 3+ layers (prop drilling) — lift to composition or context",
      "Define components inside other components (they remount every render)",
    ],
    good: `type ButtonProps = React.ComponentProps<"button"> & { variant?: "primary" | "ghost" };

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={cn(styles[variant], className)} {...props} />;
}`,
    bad: `function Page() {
  // Re-created every render -> state is lost on each parent update
  function Card() { return <div /> }
  return <Card />;
}`,
    tags: ["components", "props", "composition", "children"],
  },
  {
    id: "react-state",
    category: "react",
    title: "Put state in the right place",
    summary: "Keep state as local and as minimal as possible; derive everything else during render.",
    do: [
      "Start with local `useState`; lift up only when siblings need it",
      "Derive values during render (`const total = items.reduce(...)`) instead of storing them",
      "Use `useReducer` when next state depends on complex transitions",
      "Use URL search params for shareable UI state (filters, tabs, pagination)",
      "Use a server-state library (TanStack Query / SWR) for client-side remote data",
      "Reach for Zustand/Jotai only for genuinely global client state; avoid Redux unless already adopted",
    ],
    dont: [
      "Mirror props into state (`useState(props.value)`) unless it is an explicit initial value",
      "Store derived data in state and sync it with an effect",
      "Put server data in a global client store",
      "Mutate state directly — always create new objects/arrays",
    ],
    good: `const [items, setItems] = useState<Item[]>([]);
const total = items.reduce((sum, i) => sum + i.price, 0); // derived, not stored`,
    bad: `const [items, setItems] = useState<Item[]>([]);
const [total, setTotal] = useState(0);
useEffect(() => setTotal(items.reduce((s, i) => s + i.price, 0)), [items]);`,
    tags: ["state", "useState", "useReducer", "derived", "zustand", "url"],
  },
  {
    id: "react-effects",
    category: "react",
    title: "You might not need an effect",
    summary: "Effects are for synchronising with external systems (subscriptions, timers, DOM APIs) — not for data transformation or event handling.",
    do: [
      "Handle user actions in event handlers, not effects",
      "Always return a cleanup function for subscriptions, timers and listeners",
      "Declare every reactive value in the dependency array and fix the code, not the lint rule",
      "Use `useSyncExternalStore` for external stores",
      "Use `key` to reset component state instead of an effect that resets it",
      "Fetch data on the server (RSC) or with TanStack Query/SWR — not a raw `useEffect`",
    ],
    dont: [
      "Chain effects that set state to trigger other effects",
      "Fetch in `useEffect` without abort/race handling",
      "Disable `react-hooks/exhaustive-deps`",
      "Use effects to compute derived values or notify parents",
    ],
    good: `useEffect(() => {
  const ctrl = new AbortController();
  fetch(url, { signal: ctrl.signal }).then(r => r.json()).then(setData).catch(ignoreAbort);
  return () => ctrl.abort();
}, [url]);`,
    bad: `useEffect(() => {
  fetch(url).then(r => r.json()).then(setData); // race conditions, no cleanup
}, []);`,
    tags: ["useEffect", "hooks", "cleanup", "dependencies", "fetch"],
  },
  {
    id: "react-lists-keys",
    category: "react",
    title: "Stable keys for lists",
    summary: "Keys let React track item identity across renders. Unstable keys cause bugs and wasted renders.",
    do: ["Use a stable unique id from your data (database id, slug)", "Generate ids when the data is created, not during render"],
    dont: ["Use array index as key for lists that can reorder, insert or delete", "Use `Math.random()` or `crypto.randomUUID()` in render as key"],
    good: `{todos.map(t => <TodoItem key={t.id} todo={t} />)}`,
    bad: `{todos.map((t, i) => <TodoItem key={i} todo={t} />)}`,
    tags: ["keys", "lists", "map"],
  },
  {
    id: "react-hooks-custom",
    category: "react",
    title: "Extract reusable logic into custom hooks",
    summary: "Custom hooks share stateful logic, not UI. Name them `useX`, keep them focused, and type their return values.",
    do: [
      "Extract when logic is reused or when a component mixes too many concerns",
      "Return a stable, typed API (object for many values, tuple for two)",
      "Follow the Rules of Hooks: top level only, never conditional",
      "Colocate hooks with the feature that owns them (`features/cart/useCart.ts`)",
    ],
    dont: ["Create a hook that only wraps a single `useState`", "Call hooks in loops, conditions or nested functions"],
    tags: ["hooks", "custom hooks", "reuse"],
  },
  {
    id: "react-forms",
    category: "react",
    title: "Forms: React 19 actions, validation, and progressive enhancement",
    summary: "Prefer form Actions with `useActionState`/`useFormStatus`/`useOptimistic`; validate with a schema on both client and server.",
    do: [
      "Use uncontrolled inputs + `FormData` by default; controlled only when you need live feedback",
      "Validate with Zod (or Valibot) and share the schema between client and server",
      "Use `useActionState` for pending/error state and `useOptimistic` for instant UI",
      "Associate every input with a `<label>` and surface errors with `aria-describedby`",
      "Use react-hook-form for large, complex forms",
    ],
    dont: ["Trust client-side validation alone", "Use `onClick` on a submit button instead of `onSubmit`/`action` on the form"],
    good: `"use client";
const [state, formAction, pending] = useActionState(createPost, { errors: {} });
return <form action={formAction}>...<button disabled={pending}>Save</button></form>;`,
    tags: ["forms", "actions", "useActionState", "validation", "zod", "react 19"],
  },
  {
    id: "react-suspense-errors",
    category: "react",
    title: "Suspense and error boundaries",
    summary: "Model loading and failure declaratively with Suspense and error boundaries placed at meaningful UI boundaries.",
    do: [
      "Wrap async/lazy sections in `<Suspense fallback={<Skeleton />}>` with layout-matching skeletons",
      "Add error boundaries around independent widgets so one failure doesn't blank the page",
      "Use `use(promise)` with promises created outside render (or passed from a Server Component)",
      "Log boundary errors to your monitoring tool (Sentry, etc.)",
    ],
    dont: ["Show a page-wide spinner for everything", "Create a new promise inside render and pass it to `use()`"],
    tags: ["suspense", "error boundary", "loading", "use", "skeleton"],
  },
  {
    id: "react-compiler-memo",
    category: "performance",
    title: "Memoization: measure first, let the React Compiler help",
    summary: "Don't sprinkle useMemo/useCallback everywhere. Enable the React Compiler where possible and optimise measured bottlenecks.",
    do: [
      "Enable React Compiler (babel-plugin-react-compiler / `reactCompiler: true` in Next.js) for automatic memoization",
      "Profile with React DevTools Profiler before optimising",
      "Use `React.memo` for expensive pure components that receive stable props",
      "Use `useMemo` for genuinely expensive computations; `useCallback` when passing to memoized children",
      "Virtualise long lists (TanStack Virtual, react-window)",
      "Use `useDeferredValue`/`startTransition` for heavy non-urgent updates",
    ],
    dont: ["Wrap every function in useCallback", "Create new object/array/function props inline for memoized children", "Optimise without measuring"],
    tags: ["memo", "useMemo", "useCallback", "compiler", "profiling", "virtualization", "transition"],
  },
  {
    id: "react-project-structure",
    category: "react",
    title: "Feature-based project structure",
    summary: "Organise by feature/domain rather than by file type so related code changes together.",
    do: [
      "Group by feature: `features/orders/{components,hooks,api,types}`",
      "Keep shared primitives in `components/ui` and utilities in `lib`",
      "Use barrel files sparingly (they hurt tree-shaking and HMR); prefer direct imports",
      "Use path aliases (`@/features/...`) instead of deep relative imports",
      "Colocate tests, stories and styles with the component",
    ],
    dont: ["Create giant `utils.ts`/`helpers.ts` dumping grounds", "Import from one feature's internals in another feature"],
    tags: ["structure", "folders", "architecture", "features"],
  },
  {
    id: "ts-react",
    category: "typescript",
    title: "TypeScript with React",
    summary: "Use strict mode and model your data with precise types; let inference do most of the work.",
    do: [
      "Enable `strict` and `noUncheckedIndexedAccess`",
      "Type props with `type`/`interface`; let return types be inferred for components",
      "Use discriminated unions for variant state (`{status:'loading'} | {status:'success', data}`)",
      "Use `satisfies` to validate constants without widening",
      "Infer types from Zod schemas (`z.infer<typeof Schema>`) — one source of truth",
      "Use generics for reusable components (`<Select<T> />`)",
    ],
    dont: ["Use `any` (use `unknown` and narrow)", "Use `React.FC` by default", "Cast with `as` to silence errors", "Use enums — prefer string-literal unions or `as const` objects"],
    good: `type State<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };`,
    tags: ["typescript", "types", "props", "generics", "zod"],
  },
  {
    id: "a11y-basics",
    category: "accessibility",
    title: "Accessibility (WCAG 2.2 AA) by default",
    summary: "Use semantic HTML first, ARIA second. Everything must work with keyboard and screen readers.",
    do: [
      "Use semantic elements: `button`, `a`, `nav`, `main`, `header`, `ul`, `label`",
      "Every image has `alt` (empty `alt=\"\"` if decorative)",
      "Manage focus on route changes, dialogs and menus; trap focus in modals (use `<dialog>` or Radix/React Aria)",
      "Ensure 4.5:1 text contrast and visible `:focus-visible` styles",
      "Respect `prefers-reduced-motion` and `prefers-color-scheme`",
      "Use `eslint-plugin-jsx-a11y` and test with axe / Testing Library `getByRole`",
      "Use headless accessible primitives (Radix UI, React Aria, Headless UI) for complex widgets",
    ],
    dont: ["Use `div`/`span` with `onClick` as buttons", "Remove focus outlines without a replacement", "Use `aria-*` to fix bad semantics", "Rely on color alone to convey meaning"],
    good: `<button type="button" onClick={open}>Open menu</button>`,
    bad: `<div onClick={open}>Open menu</div>`,
    tags: ["a11y", "accessibility", "aria", "keyboard", "wcag", "semantic"],
  },
  {
    id: "testing-frontend",
    category: "testing",
    title: "Testing strategy",
    summary: "Test behaviour the way users experience it; favour integration tests over implementation details.",
    do: [
      "Use Vitest/Jest + React Testing Library; query by role, label and text",
      "Use `userEvent` (not `fireEvent`) to simulate real interactions",
      "Mock the network with MSW rather than mocking `fetch` or hooks",
      "Cover critical journeys with Playwright end-to-end tests",
      "Unit-test pure logic and hooks (`renderHook`)",
      "Run type-check, lint and tests in CI on every PR",
    ],
    dont: ["Test implementation details (state values, internal method calls)", "Rely on snapshots for large trees", "Use `data-testid` when a role/label query works"],
    tags: ["testing", "vitest", "jest", "rtl", "playwright", "msw"],
  },
  {
    id: "perf-bundle",
    category: "performance",
    title: "Bundle size and runtime performance",
    summary: "Ship less JavaScript, load it later, and keep the main thread free.",
    do: [
      "Code-split with `React.lazy`/`next/dynamic` for heavy, below-the-fold or interaction-gated components",
      "Import only what you need (`import debounce from 'lodash-es/debounce'`)",
      "Analyse with `@next/bundle-analyzer` or `source-map-explorer` regularly",
      "Prefer native/lightweight libs (`date-fns`, `Intl`) over heavy ones (moment)",
      "Use `useTransition` and web workers for heavy computation",
      "Set performance budgets in CI (Lighthouse CI)",
    ],
    dont: ["Import whole icon/utility libraries", "Ship large JSON or polyfills you don't need", "Block the main thread with long synchronous tasks"],
    tags: ["bundle", "code splitting", "lazy", "dynamic", "lighthouse", "tree shaking"],
  },
];
