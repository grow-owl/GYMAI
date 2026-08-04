import clsx from "clsx";

export default function Card({
  children,
  className,
  sweep,
}: {
  children: React.ReactNode;
  className?: string;
  sweep?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-4 sm:p-5",
        sweep && "energy-sweep",
        className
      )}
    >
      {children}
    </div>
  );
}
