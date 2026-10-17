import { getCurrentDrivers } from "@/lib/f1/drivers";
import { PageHeader } from "@/components/layout/page-header";
import { DriverGrid } from "@/components/drivers/driver-grid";

export const metadata = { title: "Drivers" };
export const dynamic = "force-dynamic";

export default async function DriversPage() {
  const { drivers, demo } = await getCurrentDrivers();
  return (
    <div>
      <PageHeader
        eyebrow="2026 Season"
        title="Drivers"
        description="Current-season lineup as recorded by OpenF1 at the latest completed race weekend."
        status={demo ? "demo" : "historical"}
      />
      <DriverGrid drivers={drivers} />
    </div>
  );
}
