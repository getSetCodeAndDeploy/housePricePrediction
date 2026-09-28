import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const apps = [
  {
    href: "/estimator",
    title: "Property Value Estimator",
    text: "Enter property details, get a price estimate with a feature breakdown, review past estimates and compare properties side by side.",
    stack: "Python · FastAPI",
  },
  {
    href: "/market",
    title: "Market Analysis",
    text: "Explore market statistics, filter property segments, run what-if scenarios and export the data.",
    stack: "Java 21 · Spring Boot",
  },
];

export default function Home() {
  return (
    <>
      <PageHeader title="Housing Portal" description="Two independent applications, one shared regression model." />
      <div className="grid gap-4 sm:grid-cols-2">
        {apps.map((a) => (
          <Link key={a.href} href={a.href} className="group rounded-lg">
            <Card className="h-full transition-colors group-hover:border-brand">
              <CardBody>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold">{a.title}</h2>
                  <Badge tone="brand">{a.stack}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted">{a.text}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
