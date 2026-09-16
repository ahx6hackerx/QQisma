export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-md bg-clay-50 px-3 py-2 text-sm text-clay-600">{message}</p>;
}
