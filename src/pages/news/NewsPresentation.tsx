import { useState } from "react";
import { format } from "date-fns";
import { Newspaper } from "lucide-react";

export function newsDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : format(date, "d MMM yyyy");
}

export function NewsImage({
  src,
  source,
  priority = false,
}: {
  src: string | null;
  source: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`news-image ${!src || failed ? "has-no-image" : ""}`}>
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="news-image-fallback">
          <Newspaper size={30} aria-hidden="true" />
          <span>{source}</span>
          <small>
            From the news desk ·{" "}
            {failed ? "Image unavailable" : "No image supplied"}
          </small>
        </div>
      )}
    </div>
  );
}
