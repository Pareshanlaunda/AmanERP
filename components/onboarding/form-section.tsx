import { cn } from "@/lib/utils";

type FormSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section className={cn("erp-panel overflow-hidden p-4 sm:p-6", className)}>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">{children}</div>
    </section>
  );
}

type FormFieldProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
};

export function FormField({
  label,
  error,
  children,
  className,
  fullWidth = false,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", fullWidth && "md:col-span-2", className)}>
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
