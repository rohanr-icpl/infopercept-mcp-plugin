import { Tray } from "@phosphor-icons/react/dist/ssr";

/* Empty: say what is missing, why, and one clear next action. */
export function EmptyState({ title, why, action }: { title: string; why: string; action?: React.ReactNode }) {
  return (
    <div className="state">
      <Tray size={24} weight="bold" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{why}</p>
      {action}
    </div>
  );
}
