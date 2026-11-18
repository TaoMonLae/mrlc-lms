import { type Overview, can, attendanceStats, gedSubjects, readinessSteps, dateLabel, money } from "./familyShared";

export default function FamilyPrintSummary({ overview, schoolName }: { overview: Overview; schoolName: string }) {
  const stats = attendanceStats(overview.attendance);
  const balance = overview.fees.reduce((sum, fee) => sum + fee.balance, 0);
  const cell = "border border-solid px-2 py-1.5 text-left align-top";
  const ink = { borderColor: "#000" };
  return <div className="official-doc hidden text-[11pt] leading-snug text-black print:block">
    <div className="border-0 border-b-2 border-solid pb-2" style={ink}>
      <p className="text-[10pt]">{schoolName} · Family summary</p>
      <h1 className="mt-1 text-[18pt] font-bold">{overview.student.name}</h1>
      <p>{[overview.student.className, overview.student.studentCode].filter(Boolean).join(" · ")} · Printed {dateLabel(overview.asOf, { day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
    {can(overview, "LEARNING") && <>
    <h2 className="mt-5 text-[13pt] font-bold">GED readiness</h2>
    <table className="mt-2 w-full border-collapse">
      <thead><tr><th className={cell} style={ink}>Subject</th><th className={cell} style={ink}>Status</th><th className={cell} style={ink}>Teacher note</th></tr></thead>
      <tbody>{gedSubjects.map((subject) => {
        const row = overview.readiness.find((item) => item.subject === subject.key);
        return <tr key={subject.key}><td className={cell} style={ink}>{subject.label}</td><td className={cell} style={ink}>{row ? readinessSteps.find((step) => step.key === row.status)?.label : "Not assessed yet"}</td><td className={cell} style={ink}>{row?.note || ""}</td></tr>;
      })}</tbody>
    </table>
    </>}
    {can(overview, "ATTENDANCE") && <>
    <h2 className="mt-5 text-[13pt] font-bold">Attendance, last 3 months</h2>
    <p className="mt-1">Rate {stats.rate == null ? "not available" : `${stats.rate}%`} · Present {stats.present} · Late {stats.late} · Absent {stats.absent} · Excused {stats.excused}</p>
    </>}
    {can(overview, "LEARNING") && <>
    <h2 className="mt-5 text-[13pt] font-bold">Recent results</h2>
    {overview.examResults.length ? <table className="mt-2 w-full border-collapse">
      <thead><tr><th className={cell} style={ink}>Test</th><th className={cell} style={ink}>Subject</th><th className={cell} style={ink}>Date</th><th className={cell} style={ink}>Score</th></tr></thead>
      <tbody>{overview.examResults.slice(0, 8).map((result) => <tr key={result.id}><td className={cell} style={ink}>{result.title}</td><td className={cell} style={ink}>{result.subject || ""}</td><td className={cell} style={ink}>{result.completedAt ? dateLabel(result.completedAt) : ""}</td><td className={cell} style={ink}>{result.score} / {result.totalMarks} ({result.percent}%)</td></tr>)}</tbody>
    </table> : <p className="mt-1">No released results.</p>}
    </>}
    {can(overview, "FEES") && <>
    <h2 className="mt-5 text-[13pt] font-bold">Fees</h2>
    <p className="mt-1">Balance to pay: {money(balance, overview.fees[0]?.currency || "MYR")}</p>
    </>}
    {overview.access.scopes.length < 3 && <p className="mt-5 text-[10pt]">Some sections are not shown because {overview.student.name} is 18 or older and has not chosen to share them.</p>}
  </div>;
}
