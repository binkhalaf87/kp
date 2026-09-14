export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-black text-navy">{title}</h1>
      {description && <p className="text-sm text-muted mt-1">{description}</p>}
    </div>
  );
}
