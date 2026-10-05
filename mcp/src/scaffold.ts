export type ComponentKind = "server" | "client";

export function componentTemplate(name: string, kind: ComponentKind, withProps: boolean): string {
  const directive = kind === "client" ? `"use client";\n\n` : "";
  const props = withProps ? `type ${name}Props = {\n  title: string;\n};\n\n` : "";
  const sig = withProps ? `{ title }: ${name}Props` : "";
  const body = kind === "client"
    ? `  const [count, setCount] = useState(0);\n\n  return (\n    <section aria-labelledby="${name}-heading">\n      <h2 id="${name}-heading">${withProps ? "{title}" : name}</h2>\n      <button type="button" onClick={() => setCount((c) => c + 1)}>\n        Clicked {count} times\n      </button>\n    </section>\n  );`
    : `  return (\n    <section aria-labelledby="${name}-heading">\n      <h2 id="${name}-heading">${withProps ? "{title}" : name}</h2>\n    </section>\n  );`;
  const imp = kind === "client" ? `import { useState } from "react";\n\n` : "";
  return `${directive}${imp}${props}export function ${name}(${sig}) {\n${body}\n}\n`;
}

export function testTemplate(name: string, withProps: boolean): string {
  return `import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ${name} } from "./${name}";

describe("${name}", () => {
  it("renders an accessible heading", () => {
    render(<${name}${withProps ? ' title="Hello"' : ""} />);
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });
});
`;
}

export function featureStructure(feature: string, framework: "react" | "nextjs"): string {
  if (framework === "nextjs") {
    return `src/
  app/
    (app)/${feature}/
      page.tsx          # Server Component: fetch + compose
      loading.tsx       # Suspense skeleton
      error.tsx         # "use client" error UI
      [id]/page.tsx
  features/${feature}/
    components/         # UI for this feature (Server by default)
    actions.ts          # "use server" mutations (validate + authorise)
    queries.ts          # server-only data access (import "server-only")
    schema.ts           # Zod schemas + inferred types
    ${feature}.test.tsx
  components/ui/        # shared design-system primitives
  lib/{db.ts,auth.ts,env.ts}`;
  }
  return `src/
  features/${feature}/
    components/
    hooks/use${feature[0]!.toUpperCase()}${feature.slice(1)}.ts
    api.ts              # typed API client / TanStack Query hooks
    types.ts
    ${feature}.test.tsx
  components/ui/
  lib/`;
}
