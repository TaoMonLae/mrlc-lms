import React from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

const triggerClass = 'h-14 flex-none rounded-none px-5 font-semibold data-active:bg-transparent data-active:text-foreground dark:data-active:bg-transparent dark:data-active:text-foreground data-active:shadow-none group-data-horizontal/tabs:after:bottom-0 after:bg-academic-teal focus-visible:ring-inset';

export function StudentProfileTabsList({ canViewFees, canViewCases }: { canViewFees: boolean; canViewCases: boolean }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = React.useState({ overflow: false, left: false, right: false });

  const updateScroll = React.useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const maximum = element.scrollWidth - element.clientWidth;
    setScroll({ overflow: maximum > 1, left: element.scrollLeft > 1, right: element.scrollLeft < maximum - 1 });
  }, []);

  React.useEffect(() => {
    const observer = new ResizeObserver(updateScroll);
    if (scrollRef.current) observer.observe(scrollRef.current);
    if (listRef.current) observer.observe(listRef.current);
    updateScroll();
    return () => observer.disconnect();
  }, [updateScroll, canViewFees, canViewCases]);

  const move = (direction: number) => {
    const element = scrollRef.current;
    if (element) element.scrollBy({ left: direction * Math.max(120, element.clientWidth * 0.75) });
  };

  const revealFocusedTab = (event: React.FocusEvent<HTMLDivElement>) => {
    const element = scrollRef.current;
    if (!element || !(event.target instanceof HTMLElement) || event.target.getAttribute('role') !== 'tab') return;
    const viewport = element.getBoundingClientRect();
    const tab = event.target.getBoundingClientRect();
    if (tab.left < viewport.left) element.scrollLeft += tab.left - viewport.left;
    else if (tab.right > viewport.right) element.scrollLeft += tab.right - viewport.right;
  };

  return (
    <div className="flex min-w-0 items-center border-b border-slate-200 dark:border-surface-raised px-2">
      {scroll.overflow && <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Scroll profile tabs left" disabled={!scroll.left} onClick={() => move(-1)}><ChevronLeft /></Button>}
      <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain" onScroll={updateScroll} onFocusCapture={revealFocusedTab}>
        <TabsList ref={listRef} variant="line" aria-label="Student profile sections" className="w-max min-w-full justify-start gap-0 p-0 group-data-horizontal/tabs:h-14">
          <TabsTrigger value="overview" className={triggerClass}>Overview</TabsTrigger>
          <TabsTrigger value="attendance" className={triggerClass}>Attendance</TabsTrigger>
          <TabsTrigger value="exams" className={triggerClass}>Exams</TabsTrigger>
          {canViewFees && <TabsTrigger value="fees" className={triggerClass}>Fees</TabsTrigger>}
          <TabsTrigger value="documents" className={triggerClass}><FileText />Documents</TabsTrigger>
          {canViewCases && <TabsTrigger value="cases" className={triggerClass}>Cases</TabsTrigger>}
        </TabsList>
      </div>
      {scroll.overflow && <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Scroll profile tabs right" disabled={!scroll.right} onClick={() => move(1)}><ChevronRight /></Button>}
    </div>
  );
}
