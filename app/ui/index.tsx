import { forwardRef, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";

type Tone = "default" | "primary" | "accent" | "success" | "warning" | "danger" | "info" | "muted";
type ButtonVariant = "primary" | "secondary" | "accent" | "danger" | "ghost";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function categoryTagClassName(category: string) {
  const normalized = category.trim().toLowerCase();

  if (!normalized) return "ui-tag--category-other";
  if (/(protein|meat|chicken|beef|pork|lamb|fish|seafood)/.test(normalized)) return "ui-tag--category-protein";
  if (/(vegetable|veg|produce|salad|herb)/.test(normalized)) return "ui-tag--category-vegetables";
  if (/(fruit|berry|berries|banana|avocado)/.test(normalized)) return "ui-tag--category-fruit";
  if (/(dairy|milk|cheese|yogh?urt|egg)/.test(normalized)) return "ui-tag--category-dairy";
  if (/(bread|wrap|bakery|tortilla|bun|roll)/.test(normalized)) return "ui-tag--category-bread";
  if (/(frozen|freezer)/.test(normalized)) return "ui-tag--category-frozen";
  if (/(household|clean|paper|napp|toilet|laundry)/.test(normalized)) return "ui-tag--category-household";
  if (/(pantry|sauce|spice|rice|pasta|tin|canned|baking|oil|snack)/.test(normalized)) return "ui-tag--category-pantry";

  return "ui-tag--category-other";
}

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  icon?: ReactNode;
  variant?: ButtonVariant;
};

export function Button({ children, className, icon, variant = "primary", ...props }: ButtonProps) {
  return (
    <button className={cx("ui-button", `ui-button--${variant}`, className)} {...props}>
      {icon ? <span className="ui-button__icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

type LinkButtonProps = {
  as: ElementType;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  variant?: ButtonVariant;
  [key: string]: unknown;
};

export function LinkButton({
  as,
  children,
  className,
  icon,
  variant = "secondary",
  ...props
}: LinkButtonProps) {
  const Component = as;
  return (
    <Component className={cx("ui-button", `ui-button--${variant}`, className)} {...props}>
      {icon ? <span className="ui-button__icon">{icon}</span> : null}
      <span>{children}</span>
    </Component>
  );
}

type IconButtonProps = ComponentPropsWithoutRef<"button"> & {
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
};

export function IconButton({ className, icon, label, variant = "secondary", ...props }: IconButtonProps) {
  return (
    <button aria-label={label} title={label} className={cx("ui-icon-button", `ui-button--${variant}`, className)} {...props}>
      {icon}
    </button>
  );
}

type FieldProps = ComponentPropsWithoutRef<"input"> & {
  label?: string;
  helper?: ReactNode;
  icon?: ReactNode;
};

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { className, helper, icon, label, ...props },
  ref
) {
  const input = <input ref={ref} className={cx("ui-input", Boolean(icon) && "ui-input--with-icon", className)} {...props} />;
  return (
    <label className="ui-field">
      {label ? <span className="ui-label">{label}</span> : null}
      {icon ? (
        <span className="ui-field__control">
          <span className="ui-field__icon">{icon}</span>
          {input}
        </span>
      ) : (
        input
      )}
      {helper ? <span className="ui-helper">{helper}</span> : null}
    </label>
  );
});

type SelectFieldProps = ComponentPropsWithoutRef<"select"> & {
  label?: string;
  helper?: ReactNode;
};

export function SelectField({ children, className, helper, label, ...props }: SelectFieldProps) {
  return (
    <label className="ui-field">
      {label ? <span className="ui-label">{label}</span> : null}
      <select className={cx("ui-input ui-select", className)} {...props}>
        {children}
      </select>
      {helper ? <span className="ui-helper">{helper}</span> : null}
    </label>
  );
}

type TagProps = ComponentPropsWithoutRef<"span"> & {
  category?: string | null;
  tone?: Tone;
};

export function Tag({ category, children, className, tone = "default", ...props }: TagProps) {
  const categoryClassName = category ? categoryTagClassName(category) : null;

  return (
    <span className={cx("ui-tag", categoryClassName ?? `ui-tag--${tone}`, className)} {...props}>
      {children}
    </span>
  );
}

type NoticeProps = ComponentPropsWithoutRef<"section"> & {
  icon?: ReactNode;
  tone?: Exclude<Tone, "default" | "muted">;
};

export function Notice({ children, className, icon, tone = "success", ...props }: NoticeProps) {
  return (
    <section className={cx("ui-notice", `ui-notice--${tone}`, className)} {...props}>
      {icon ? <span className="ui-notice__icon">{icon}</span> : null}
      <span>{children}</span>
    </section>
  );
}

type PanelProps = ComponentPropsWithoutRef<"section"> & {
  tone?: "plain" | "tinted";
};

export function Panel({ children, className, tone = "plain", ...props }: PanelProps) {
  return (
    <section className={cx("panel", tone === "tinted" && "panel--tinted", className)} {...props}>
      {children}
    </section>
  );
}

type PageHeaderProps = {
  actions?: ReactNode;
  children?: ReactNode;
  eyebrow: string;
  summary: ReactNode;
  title: string;
};

export function PageHeader({ actions, children, eyebrow, summary, title }: PageHeaderProps) {
  return (
    <section className="page-header">
      <div>
        <p className="page-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-summary">{summary}</p>
        {children}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </section>
  );
}

type TabsProps = ComponentPropsWithoutRef<"nav">;

export function Tabs({ children, className, ...props }: TabsProps) {
  return (
    <nav className={cx("ui-tabs", className)} {...props}>
      {children}
    </nav>
  );
}

type EmptyStateProps = ComponentPropsWithoutRef<"div"> & {
  icon?: ReactNode;
};

export function EmptyState({ children, className, icon, ...props }: EmptyStateProps) {
  return (
    <div className={cx("empty-state", className)} {...props}>
      {icon ? <span className="empty-state__icon">{icon}</span> : null}
      <span>{children}</span>
    </div>
  );
}

type ActionMenuProps = {
  children: ReactNode;
  label: string;
  triggerIcon: ReactNode;
};

export function ActionMenu({ children, label, triggerIcon }: ActionMenuProps) {
  return (
    <details className="action-menu">
      <summary className="action-menu__trigger" aria-label={label}>
        {triggerIcon}
      </summary>
      <div className="action-menu__panel">{children}</div>
    </details>
  );
}

type DataTableProps = ComponentPropsWithoutRef<"div">;

export function DataTable({ children, className, ...props }: DataTableProps) {
  return (
    <div className={cx("ui-data-table", className)} {...props}>
      {children}
    </div>
  );
}
