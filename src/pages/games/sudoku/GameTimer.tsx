import * as React from "react";
import { useTimer } from "./context/TimerContext";
import { formatDuration } from "@/src/lib/sudoku/utils/format";

const GameTimer: React.FC = () => {
  const { displayTime } = useTimer();

  return <div>{formatDuration(displayTime)}</div>;
};

export default GameTimer;
