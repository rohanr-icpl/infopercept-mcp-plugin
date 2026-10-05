export type Category = "invinsense" | "react" | "nextjs" | "typescript" | "performance" | "accessibility" | "security" | "testing";

export interface Practice {
  id: string;
  category: Category;
  title: string;
  summary: string;
  do: string[];
  dont: string[];
  good?: string;
  bad?: string;
  tags: string[];
}
