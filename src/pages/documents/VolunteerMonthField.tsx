const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Explicit controls avoid the locale-dependent display of native month inputs. */
export default function VolunteerMonthField({ id, label, value, max, onChange }: {
  id: string;
  label: string;
  value: string;
  max: string;
  onChange: (value: string) => void;
}) {
  const [year = '', month = ''] = value.split('-');
  const latestYear = Number(max.slice(0, 4));
  const selectClass = 'h-10 min-w-0 w-full rounded-sm border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring';
  return <fieldset className="min-w-0 space-y-1.5">
    <legend className="text-sm font-medium">{label} month / year *</legend>
    <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-2">
      <label className="min-w-0"><span className="sr-only">{label} month</span>
        <select id={`${id}-month`} className={selectClass} value={month} onChange={event => onChange(`${year}-${event.target.value}`)} required>
          <option value="">Month</option>
          {MONTHS.map((name, index) => {
            const code = String(index + 1).padStart(2, '0');
            return <option key={code} value={code} disabled={Boolean(year && `${year}-${code}` > max)}>{name}</option>;
          })}
        </select>
      </label>
      <label className="min-w-0"><span className="sr-only">{label} year</span>
        <select id={`${id}-year`} className={selectClass} value={year} onChange={event => {
          const selectedYear = event.target.value;
          onChange(`${selectedYear}-${selectedYear && month && `${selectedYear}-${month}` > max ? '' : month}`);
        }} required>
          <option value="">Year</option>
          {Array.from({ length: Math.max(0, latestYear - 1900 + 1) }, (_, index) => String(latestYear - index)).map(year => <option key={year} value={year}>{year}</option>)}
        </select>
      </label>
    </div>
  </fieldset>;
}
