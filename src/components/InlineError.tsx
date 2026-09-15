export function InlineError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
      {message}
    </p>
  );
}
