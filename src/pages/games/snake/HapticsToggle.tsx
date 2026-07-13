import * as React from "react";
import { Vibrate, VibrateOff } from "lucide-react";
import { hapticsSupported, hapticsEnabled, setHapticsEnabled, haptic } from "./haptics";

/**
 * Small toggle for vibration feedback. Renders nothing on devices without
 * vibration support, so it only appears where it's actually useful (phones).
 */
export default function HapticsToggle() {
  const [on, setOn] = React.useState(false);

  // Read the persisted preference after mount (avoids SSR/localStorage issues).
  React.useEffect(() => {
    setOn(hapticsEnabled());
  }, []);

  if (!hapticsSupported()) return null;

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        const next = !on;
        setHapticsEnabled(next);
        setOn(next);
        if (next) haptic("turn"); // confirm with a quick tick
      }}
      className="flex items-center justify-center gap-2 rounded-lg border border-gray-600 bg-gray-800/50 px-3 py-2 text-sm text-white hover:bg-gray-700/50"
    >
      {on ? <Vibrate className="size-4" /> : <VibrateOff className="size-4" />}
      Vibration: {on ? "On" : "Off"}
    </button>
  );
}
