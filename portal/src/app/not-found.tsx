import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <EmptyState title="Page not found">
      That page doesn&apos;t exist. <Link href="/" className="font-medium text-brand underline">Go back home</Link>.
    </EmptyState>
  );
}
