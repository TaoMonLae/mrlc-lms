"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, BookOpen, Eye, EyeOff, Pencil, Check, X } from "lucide-react";
import { apiGet, apiSend } from "../../../lib/api";

interface Word {
  id: string;
  word: string;
  definition: string;
  partOfSpeech?: string | null;
  difficulty: string;
  language: string;
  active: boolean;
  createdByName?: string | null;
}

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

const inputCls =
  "bg-white/10 text-white placeholder-white/40 border border-white/20 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-purple-400";

export default function CheckerVocabularyManager() {
  const [words, setWords] = React.useState<Word[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState({ word: "", definition: "", partOfSpeech: "", difficulty: "medium" });
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<Partial<Word>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ words: Word[] }>("/api/checkers-game/vocabulary");
      setWords(data.words || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load vocabulary");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const addWord = async () => {
    if (!form.word.trim() || !form.definition.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiSend("/api/checkers-game/vocabulary", "POST", {
        word: form.word.trim(),
        definition: form.definition.trim(),
        partOfSpeech: form.partOfSpeech.trim() || undefined,
        difficulty: form.difficulty,
      });
      setForm({ word: "", definition: "", partOfSpeech: "", difficulty: "medium" });
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to add word");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (id: string) => {
    setError(null);
    try {
      await apiSend(`/api/checkers-game/vocabulary/${id}`, "PUT", {
        word: editForm.word,
        definition: editForm.definition,
        partOfSpeech: editForm.partOfSpeech || undefined,
        difficulty: editForm.difficulty,
      });
      setEditingId(null);
      setEditForm({});
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save changes");
    }
  };

  const toggleActive = async (w: Word) => {
    setError(null);
    try {
      await apiSend(`/api/checkers-game/vocabulary/${w.id}`, "PUT", { active: !w.active });
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update");
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await apiSend(`/api/checkers-game/vocabulary/${id}`, "DELETE");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to delete");
    }
  };

  return (
    <div className="bg-white/10 rounded-lg p-4 border border-white/20">
      <h2 className="text-lg font-semibold mb-1 text-white flex items-center gap-2">
        <BookOpen className="size-5" /> Manage Vocabulary
      </h2>
      <p className="text-xs text-white/60 mb-4">
        Words you add here are mixed with the dictionary in the Vocabulary game for all students.
      </p>

      {/* Add form */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto_auto] gap-2 mb-3">
        <input
          className={inputCls}
          placeholder="Word"
          value={form.word}
          onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))}
        />
        <input
          className={inputCls}
          placeholder="Definition"
          value={form.definition}
          onChange={(e) => setForm((f) => ({ ...f, definition: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && addWord()}
        />
        <select
          className={inputCls}
          value={form.difficulty}
          onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d} className="bg-gray-800">
              {d}
            </option>
          ))}
        </select>
        <Button
          onClick={addWord}
          disabled={saving || !form.word.trim() || !form.definition.trim()}
          className="bg-purple-500 hover:bg-purple-600"
        >
          <Plus className="size-4 mr-1" /> Add
        </Button>
      </div>
      <input
        className={`${inputCls} w-full mb-3`}
        placeholder="Part of speech (optional, e.g. noun)"
        value={form.partOfSpeech}
        onChange={(e) => setForm((f) => ({ ...f, partOfSpeech: e.target.value }))}
      />

      {error && <p className="text-red-300 text-sm mb-2">{error}</p>}

      {/* List */}
      {loading ? (
        <p className="text-white/60 text-sm">Loading…</p>
      ) : words.length === 0 ? (
        <p className="text-white/60 text-sm">No custom words yet — add one above.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
          {words.map((w) => (
            <div
              key={w.id}
              className={`rounded-lg border border-white/10 p-2 ${w.active ? "bg-white/5" : "bg-white/[0.02] opacity-60"}`}
            >
              {editingId === w.id ? (
                <div className="flex flex-col gap-2">
                  <input
                    className={inputCls}
                    value={editForm.word ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, word: e.target.value }))}
                  />
                  <input
                    className={inputCls}
                    value={editForm.definition ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, definition: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(w.id)} className="bg-green-600 hover:bg-green-700">
                      <Check className="size-4 mr-1" /> Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditForm({});
                      }}
                      className="bg-white/10 text-white border-white/30"
                    >
                      <X className="size-4 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{w.word}</span>
                      {w.partOfSpeech && <span className="text-xs text-white/50">({w.partOfSpeech})</span>}
                      <span className="text-[10px] uppercase tracking-wide bg-purple-500/30 text-white/80 rounded px-1.5 py-0.5">
                        {w.difficulty}
                      </span>
                      {!w.active && <span className="text-[10px] text-yellow-300">hidden</span>}
                    </div>
                    <p className="text-sm text-white/70 truncate">{w.definition}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      title={w.active ? "Hide from game" : "Show in game"}
                      onClick={() => toggleActive(w)}
                      className="p-1.5 rounded hover:bg-white/10 text-white/70"
                    >
                      {w.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                    <button
                      title="Edit"
                      onClick={() => {
                        setEditingId(w.id);
                        setEditForm({ word: w.word, definition: w.definition, partOfSpeech: w.partOfSpeech ?? "", difficulty: w.difficulty });
                      }}
                      className="p-1.5 rounded hover:bg-white/10 text-white/70"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      title="Delete"
                      onClick={() => remove(w.id)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-red-300"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
