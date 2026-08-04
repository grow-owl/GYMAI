import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const equipment = [
  { name: "Treadmill (x6)", status: "good", note: "Last serviced 2 weeks ago" },
  { name: "Cable Crossover", status: "warn", note: "Maintenance due in 5 days" },
  { name: "Smith Machine", status: "good", note: "Last serviced 1 month ago" },
  { name: "Rowing Machine (x3)", status: "danger", note: "Maintenance overdue" },
];

export default function Inventory() {
  return (
    <div>
      <PageHeader title="Inventory" subtitle="Equipment & maintenance tracking" backTo="/owner" />
      <div className="space-y-3">
        {equipment.map((e) => (
          <Card key={e.name} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-(--color-text)">{e.name}</p>
              <p className="text-xs text-(--color-text-faint) mt-0.5">{e.note}</p>
            </div>
            <Badge tone={e.status as "good" | "warn" | "danger"}>{e.status === "good" ? "OK" : e.status === "warn" ? "Due soon" : "Overdue"}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
