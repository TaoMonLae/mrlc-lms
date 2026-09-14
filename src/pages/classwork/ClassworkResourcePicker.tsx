import { useEffect, useState } from "react";
import { apiGet } from "../../lib/api";

interface ResourceOption {
  title: string;
  kind: string;
  url: string;
}
export default function ClassworkResourcePicker({
  classId,
  disabled,
  onChoose,
}: {
  classId: string;
  disabled: boolean;
  onChoose: (item: ResourceOption) => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ResourceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setItems([]);
    const timer = setTimeout(() => {
      apiGet<ResourceOption[]>(
        `/api/classwork/classes/${classId}/catalog?q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      )
        .then(setItems)
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [classId, query]);
  return (
    <details className="cw-catalog">
      <summary>Choose from MRLC’s library, News or Language Quest</summary>
      <div>
        <label>
          Find a resource
          <input
            disabled={disabled}
            maxLength={100}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title…"
          />
        </label>
        <p className="cw-hint">
          Up to 20 matches per collection. Search to find more.
        </p>
        {loading ? (
          <p role="status">Searching resources…</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : items.length ? (
          <ul>
            {items.map((item) => (
              <li key={item.url}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChoose(item)}
                >
                  <span>{item.kind}</span>
                  <strong>{item.title}</strong>
                  <span>Choose →</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No matching resources.</p>
        )}
      </div>
    </details>
  );
}
