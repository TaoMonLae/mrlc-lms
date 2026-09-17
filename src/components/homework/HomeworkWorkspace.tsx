import type { ReactNode } from "react";
import AnimatedContent from "../react-bits/AnimatedContent";
import "./homework.css";

export function HomeworkMasthead({
  audience,
  title,
  description,
  action,
}: {
  audience: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="hw-masthead">
      <div>
        <p className="hw-eyebrow">MRLC / Learning workspace / {audience}</p>
        <h1>{title}</h1>
        <p className="hw-description">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function HomeworkFocus({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <AnimatedContent>
      <section className="hw-focus">
        <div>
          <p className="hw-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <div className="hw-focus-content">{children}</div>
      </section>
    </AnimatedContent>
  );
}
