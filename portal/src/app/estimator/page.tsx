import type { Metadata } from "next";
import { APP1_API_URL } from "@/lib/config";
import { ApiError, fetchJson } from "@/lib/api";
import type { EstimatesPage } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Alert from "@/components/ui/Alert";
import RetryButton from "@/components/RetryButton";
import EstimatorWorkspace from "@/components/estimator/EstimatorWorkspace";

export const metadata: Metadata = { title: "Property Value Estimator" };
export const dynamic = "force-dynamic";

/**
 * Server Component: loads the saved history on the server (no client-side loading flash), then hands it to the
 * interactive client workspace. A backend outage renders an inline error with Retry; anything unexpected falls
 * through to error.tsx.
 */
export default async function EstimatorPage() {
  let initial: EstimatesPage | null = null;
  let error: ApiError | null = null;
  try {
    initial = await fetchJson<EstimatesPage>(`${APP1_API_URL}/api/estimates?limit=50`, { cache: "no-store" });
  } catch (e) {
    if (e instanceof ApiError) error = e;
    else throw e;
  }

  return (
    <>
      <PageHeader title="Property Value Estimator" description="Get a price estimate for a property, see what drives it, and compare properties side by side." />
      {initial ? (
        <EstimatorWorkspace initial={initial} />
      ) : (
        <Alert tone="error" title="The estimator backend is unavailable" action={<RetryButton />}>
          {error?.message}
        </Alert>
      )}
    </>
  );
}
