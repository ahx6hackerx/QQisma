import { NavLink } from "react-router-dom";

export interface TabItem {
  to: string;
  label: string;
  end?: boolean;
}

export function Tabs({ items }: { items: TabItem[] }) {
  return (
    <div className="border-b border-ink-100">
      <nav className="flex gap-1 overflow-x-auto px-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                isActive ? "border-brass-500 text-ink-800" : "border-transparent text-ink-400 hover:text-ink-600"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
