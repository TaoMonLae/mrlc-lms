import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

/** Keep the shell and a recovery action available when an exam view cannot render. */
export default class ExamRouteBoundary extends Component<{ children: ReactNode }, { failed: boolean; retry: number }> {
  state = { failed: false, retry: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Exam page could not render', error, info.componentStack);
  }
  render() {
    if (this.state.failed) return <section role="alert" className="mx-auto max-w-xl space-y-4 rounded-lg border border-border bg-card p-6 text-foreground">
      <h1 className="text-xl font-semibold">This exam page couldn’t open</h1>
      <p className="text-sm text-muted-foreground">Try opening it again. If the problem continues, reload the page to get the latest version.</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => this.setState(({ retry }) => ({ failed: false, retry: retry + 1 }))}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>Reload page</Button>
        <Button variant="ghost" nativeButton={false} render={<Link to="/exams" />}>Back to exams</Button>
      </div>
    </section>;
    return <div key={this.state.retry}>{this.props.children}</div>;
  }
}
