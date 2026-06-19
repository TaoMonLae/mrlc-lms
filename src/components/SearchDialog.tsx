/**
 * Mobile Search Dialog Component
 * Provides a search interface for mobile devices
 */

import { useState, useEffect } from "react";
import { Search, X, Users, BookOpen, Calendar, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  type: "student" | "class" | "exam" | "announcement";
  title: string;
  subtitle: string;
  url: string;
}

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (open) {
      // Focus input when dialog opens
      setTimeout(() => {
        const input = document.getElementById("mobile-search-input");
        input?.focus();
      }, 100);
    }
  }, [open]);

  useEffect(() => {
    const searchDelay = setTimeout(async () => {
      if (searchTerm.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const token = sessionStorage.getItem("auth_token");

        // Search students
        const studentsRes = await fetch("/api/students", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (studentsRes.ok) {
          const students = await studentsRes.json();
          const matchingStudents = students
            .filter(
              (s: any) =>
                s.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.studentCode?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .slice(0, 5)
            .map((s: any) => ({
              id: s.id,
              type: "student" as const,
              title: `${s.user?.firstName} ${s.user?.lastName}`,
              subtitle: `ID: ${s.studentCode}`,
              url: `/students/${s.id}`,
            }));
          setResults(matchingStudents);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchDelay);
  }, [searchTerm]);

  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "student":
        return Users;
      case "class":
        return BookOpen;
      case "exam":
        return FileText;
      case "announcement":
        return Calendar;
      default:
        return Search;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onOpenChange(false);
    setSearchTerm("");
    setResults([]);
    navigate(result.url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-slate-400" />
            <DialogTitle className="text-lg font-semibold">Search</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-4 py-3">
          <div className="relative">
            <Input
              id="mobile-search-input"
              type="text"
              placeholder="Search students, classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-10 rounded-none"
                onClick={() => {
                  setSearchTerm("");
                  setResults([]);
                }}
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
            <div className="space-y-1 pb-2">
              {results.map((result) => {
                const Icon = getResultIcon(result.type);
                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{result.title}</div>
                      <div className="text-xs text-slate-500 truncate">{result.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-12 w-12 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No results found</p>
              <p className="text-xs text-slate-400 mt-1">Try different keywords</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-12 w-12 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Type to search</p>
              <p className="text-xs text-slate-400 mt-1">Search students and classes</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t bg-slate-50 dark:bg-slate-900/50">
          <p className="text-xs text-slate-500 text-center">
            Press <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded border">ESC</kbd> to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
