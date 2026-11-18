import { MessageSquareText } from "lucide-react";
import { type Overview, Panel, EmptyLine, ViewHeading, SharingNotice, can, dateLabel, dayKey, daysBetween, money, secondaryButton } from "./familyShared";

const statusLabel: Record<string, string> = { PAID: "Paid", PARTIAL: "Part paid", PENDING: "Not paid", UNPAID: "Not paid", OVERDUE: "Overdue", WAIVED: "Waived", ASSIGNED: "Not paid", CANCELLED: "Cancelled" };

export default function FamilyFees({ overview, askAbout }: { overview: Overview; askAbout: (topic: string) => void }) {
  const fees = [...overview.fees].sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const outstanding = fees.reduce((sum, fee) => sum + fee.balance, 0);
  const currency = fees[0]?.currency || "MYR";
  const next = [...fees].filter((fee) => fee.balance > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const paidTotal = fees.reduce((sum, fee) => sum + fee.paidAmount, 0);
  if (!can(overview, "FEES")) return <div><ViewHeading title="Fees and receipts" description="School fee records for your learner." /><SharingNotice overview={overview} scope="FEES" /></div>;

  return <div>
    <ViewHeading title="Fees and receipts" description="School fee records for your learner. Payments are made at the MRLC office; this page is for checking only." action={<button type="button" onClick={() => askAbout("FEES")} className={secondaryButton}><MessageSquareText className="size-4" aria-hidden="true" />Ask about a fee</button>} />
    <Panel>
      <dl className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4 sm:px-6"><dt className="text-sm text-muted-foreground">Balance to pay</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{money(outstanding, currency)}</dd></div>
        <div className="px-5 py-4 sm:px-6"><dt className="text-sm text-muted-foreground">Next due</dt><dd className="mt-1 text-base font-semibold text-foreground">{next ? <>{dateLabel(next.dueDate)}<span className="block text-sm font-normal text-muted-foreground">{next.description} · {money(next.balance, next.currency)}</span></> : "Nothing due"}</dd></div>
        <div className="px-5 py-4 sm:px-6"><dt className="text-sm text-muted-foreground">Paid so far</dt><dd className="mt-1 text-base font-semibold tabular-nums text-foreground">{money(paidTotal, currency)}</dd></div>
      </dl>
    </Panel>
    <Panel title="Statement" id="statement-title" className="mt-6">
      {fees.length ? <ul className="divide-y divide-border">
        {fees.map((fee) => {
          const overdue = fee.balance > 0 && daysBetween(overview.today, dayKey(fee.dueDate)) < 0;
          return <li key={fee.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground">{fee.description}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">Due {dateLabel(fee.dueDate)}{fee.paidDate ? ` · Paid ${dateLabel(fee.paidDate)}` : ""}{fee.receiptNumber ? <> · Receipt <span className="font-medium tabular-nums text-foreground" data-no-i18n>{fee.receiptNumber}</span></> : ""}</p>
              <p className={`mt-1 text-sm font-medium ${overdue ? "text-destructive" : fee.balance === 0 ? "text-success" : "text-foreground"}`}>{overdue ? "Overdue" : statusLabel[fee.status] || fee.status.toLowerCase()}</p>
            </div>
            <div className="sm:text-right">
              <p className="font-semibold tabular-nums text-foreground">{money(fee.amount, fee.currency)}</p>
              <p className="text-sm tabular-nums text-muted-foreground">{fee.balance > 0 ? `${money(fee.balance, fee.currency)} left` : "Settled"}</p>
            </div>
          </li>;
        })}
      </ul> : <EmptyLine>No fee records for this learner.</EmptyLine>}
    </Panel>
  </div>;
}
