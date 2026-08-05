/**
 * Global search dialog — opened from the top-bar search box (desktop and
 * mobile) or with Ctrl/Cmd+K. Searches students, teachers and classes via
 * one API call, with arrow-key navigation.
 */

import { useEffect, useMemo, useState } from "react";
import { Search, X, Users, BookOpen, UserSquare2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router";
import { apiGet } from "../lib/api";

interface SearchResult {
  id: string;
  type: "student" | "teacher" | "class";
  title: string;
  subtitle: string;
  url: string;
}

interface ApiSearch {
  students: { id: string; name: string; code: string; className: string | null }[];
  teachers: { id: string; name: string; code: string }[];
  classes: { id: string; name: string; level: string }[];
}

const TYPE_META = {
  student: { icon: Users, label: "Students" },
  teacher: { icon: UserSquare2, label: "Teachers" },
  class: { icon: BookOpen, label: "Classes" },
} as const;

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  useEffect(() => {
    if (open) {
      setTimeout(() => document.getElementById("global-search-input")?.focus(), 100);
    } else {
      setSearchTerm("");
      setResults([]);
      setHighlighted(0);
    }
  }, [open]);

  useEffect(() => {
    const searchDelay = setTimeout(async () => {
      if (searchTerm.length < 2) { setResults([]); return; }
      setIsSearching(true);
      try {
        const data = await apiGet<ApiSearch>(`/api/search?q=${encodeURIComponent(searchTerm)}`);
        const merged: SearchResult[] = [
          ...(data.students || []).map((s) => ({
            id: s.id, type: "student" as const, title: s.name,
            subtitle: `${s.code}${s.className ? ` · ${s.className}` : ""}`,
            url: `/students/${s.id}`,
          })),
          ...(data.teachers || []).map((t) => ({
            id: t.id, type: "teacher" as const, title: t.name,
            subtitle: t.code, url: `/teachers/${t.id}`,
          })),
          ...(data.classes || []).map((c) => ({
            id: c.id, type: "class" as const, title: c.name,
            subtitle: c.level, url: `/classes/${c.id}`,
          })),
        ];
        setResults(merged);
        setHighlighted(0);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(searchDelay);
  }, [searchTerm]);

  const grouped = useMemo(() => {
    const out: { type: SearchResult["type"]; items: SearchResult[] }[] = [];
    for (const type of ["student", "teacher", "class"] as const) {
      const items = results.filter((r) => r.type === type);
      if (items.length) out.push({ type, items });
    }
    return out;
  }, [results]);

  const openResult = (result: SearchResult) => {
    onOpenChange(false);
    navigate(result.url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && results[highlighted]) { e.preventDefault(); openResult(results[highlighted]); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg sm:max-w-lg top-[20%] translate-y-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-slate-400" />
            <DialogTitle className="text-lg font-semibold">Search</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-4 py-3">
          <div className="relative">
            <Input
              id="global-search-input"
              type="text"
              placeholder="Search students, teachers, classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pr-10"
              autoComplete="off"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-10 rounded-none"
                onClick={() => { setSearchTerm(""); setResults([]); }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto px-2">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-transparent" />
                <span className="text-sm">Searching...</span>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2 pb-2">
              {grouped.map((group) => {
                const Meta = TYPE_META[group.type];
                return (
                  <div key={group.type}>
                    <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{Meta.label}</p>
                    {group.items.map((result) => {
                      const idx = results.indexOf(result);
                      const Icon = Meta.icon;
                      return (
                        <button
                          key={result.type + result.id}
                          onClick={() => openResult(result)}
                          onMouseEnter={() => setHighlighted(idx)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                            idx === highlighted ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <Icon className="h-4.5 w-4.5 text-slate-600 dark:text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{result.title}</div>
                            <div className="text-xs text-slate-500 truncate">{result.subtitle}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-12 w-12 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No results found</p>
              <p className="text-xs text-slate-400 mt-1">Try a name, student ID, teacher code, or class name</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-12 w-12 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Type to search</p>
              <p className="text-xs text-slate-400 mt-1">Students, teachers, and classes</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t bg-slate-50 dark:bg-slate-900/50">
          <p className="text-xs text-slate-500 text-center">
            <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded border">↑↓</kbd> navigate ·{" "}
            <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded border">Enter</kbd> open ·{" "}
            <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded border">Esc</kbd> close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
