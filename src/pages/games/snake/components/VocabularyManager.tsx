"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Edit, Trash2, Save, X, Upload, Download } from "lucide-react";

interface VocabularyWord {
  id: string;
  word: string;
  definition: string;
  partOfSpeech?: string;
  difficulty: "easy" | "medium" | "hard";
  language: string;
  learned: boolean;
}

interface VocabularyManagerProps {
  studentId?: string;
  teacherView?: boolean;
}

export default function VocabularyManager({ studentId, teacherView = true }: VocabularyManagerProps) {
  const [vocabularyList, setVocabularyList] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWord, setEditingWord] = useState<VocabularyWord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<"ALL" | "easy" | "medium" | "hard">("ALL");

  // Load vocabulary from localStorage on mount, or use mock data as fallback
  useEffect(() => {
    const storedVocab = localStorage.getItem('vocabulary-snake-words');
    if (storedVocab) {
      try {
        const parsedVocab = JSON.parse(storedVocab);
        if (Array.isArray(parsedVocab) && parsedVocab.length > 0) {
          console.log('📚 Loading vocabulary from localStorage:', parsedVocab.length, 'words');
          setVocabularyList(parsedVocab);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Failed to parse stored vocabulary, using mock data');
      }
    }

    // Fallback to mock vocabulary data if nothing stored
    const mockVocabulary: VocabularyWord[] = [
      {
        id: "1",
        word: "EPHEMERAL",
        definition: "Lasting for a very short time",
        partOfSpeech: "adjective",
        difficulty: "medium",
        language: "en",
        learned: false,
      },
      {
        id: "2",
        word: "SERENDIPITY",
        definition: "Finding something good without looking for it",
        partOfSpeech: "noun",
        difficulty: "medium",
        language: "en",
        learned: false,
      },
      {
        id: "3",
        word: "ELOQUENT",
        definition: "Fluent or persuasive in speaking or writing",
        partOfSpeech: "adjective",
        difficulty: "medium",
        language: "en",
        learned: false,
      },
      {
        id: "4",
        word: "RESILIENT",
        definition: "Able to recover quickly from difficulties",
        partOfSpeech: "adjective",
        difficulty: "easy",
        language: "en",
        learned: false,
      },
      {
        id: "5",
        word: "PRAGMATIC",
        definition: "Dealing with things sensibly and realistically",
        partOfSpeech: "adjective",
        difficulty: "medium",
        language: "en",
        learned: false,
      },
    ];

    setVocabularyList(mockVocabulary);
    setLoading(false);
  }, []);

  // Save vocabulary to localStorage whenever it changes
  useEffect(() => {
    if (vocabularyList.length > 0) {
      console.log('💾 Saving vocabulary to localStorage:', vocabularyList.length, 'words');
      localStorage.setItem('vocabulary-snake-words', JSON.stringify(vocabularyList));
    }
  }, [vocabularyList]);

  const filteredVocabulary = vocabularyList.filter((word) => {
    const matchesSearch = word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      word.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === "ALL" || word.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  const handleSaveWord = (word: VocabularyWord) => {
    if (word.id && vocabularyList.find((w) => w.id === word.id)) {
      // Update existing word
      setVocabularyList(vocabularyList.map((w) => (w.id === word.id ? word : w)));
    } else {
      // Create new word
      const newWord = {
        ...word,
        id: Date.now().toString(),
        learned: false,
      };
      setVocabularyList([...vocabularyList, newWord]);
    }
    setEditingWord(null);
    setIsCreating(false);
  };

  const handleDeleteWord = (id: string) => {
    if (confirm("Are you sure you want to delete this word?")) {
      setVocabularyList(vocabularyList.filter((word) => word.id !== id));
    }
  };

  const handleExportVocabulary = () => {
    // Create CSV export
    const csvHeader = "word,definition,partOfSpeech,difficulty,language\n";
    const csvRows = vocabularyList.map(word =>
      `"${word.word}","${word.definition}","${word.partOfSpeech || ''}","${word.difficulty}","${word.language || 'en'}"`
    ).join("\n");
    const csvContent = csvHeader + csvRows;

    const csvBlob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vocabulary-list.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    // Create CSV template
    const csvTemplate = `word,definition,partOfSpeech,difficulty,language
EPHEMERAL,Lasting for a very short time,adjective,medium,en
RESILIENT,Able to recover quickly from difficulties,adjective,easy,en
PROFOUND,Very great or intense; having deep meaning,adjective,hard,en
SERENDIPITY,Finding something good without looking for it,noun,medium,en`;

    const csvBlob = new Blob([csvTemplate], { type: "text/csv" });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vocabulary-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportVocabulary = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.csv')) {
          // Parse CSV
          const lines = content.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            throw new Error("CSV file must have header and at least one data row");
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const validWords: VocabularyWord[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const wordObj: any = {};

            headers.forEach((header, index) => {
              wordObj[header] = values[index] || '';
            });

            // Validate required fields
            if (wordObj.word && wordObj.definition && wordObj.difficulty) {
              if (["easy", "medium", "hard"].includes(wordObj.difficulty)) {
                validWords.push({
                  id: `imported-${Date.now()}-${i}`,
                  word: wordObj.word.toUpperCase(),
                  definition: wordObj.definition,
                  partOfSpeech: wordObj.partOfSpeech || undefined,
                  difficulty: wordObj.difficulty as "easy" | "medium" | "hard",
                  language: wordObj.language || "en",
                  learned: false,
                });
              }
            }
          }

          if (validWords.length === 0) {
            throw new Error("No valid vocabulary words found in CSV file");
          }

          setVocabularyList(validWords);
          alert(`Successfully imported ${validWords.length} vocabulary words from CSV!`);
        } else {
          // Parse JSON (legacy support)
          const imported = JSON.parse(content);

          // Validate imported data structure
          if (!Array.isArray(imported)) {
            throw new Error("Import must be an array of vocabulary words");
          }

          // Validate each word has required fields
          const validWords = imported.filter((item) => {
            return item &&
              typeof item.word === "string" &&
              typeof item.definition === "string" &&
              typeof item.difficulty === "string" &&
              ["easy", "medium", "hard"].includes(item.difficulty);
          });

          if (validWords.length === 0) {
            throw new Error("No valid vocabulary words found in file");
          }

          // Add IDs if missing and normalize structure
          const normalizedWords = validWords.map((word) => ({
            id: word.id || `imported-${Date.now()}-${Math.random()}`,
            word: word.word.toUpperCase(),
            definition: word.definition,
            partOfSpeech: word.partOfSpeech || undefined,
            difficulty: word.difficulty as "easy" | "medium" | "hard",
            language: word.language || "en",
            learned: false,
          }));

          setVocabularyList(normalizedWords);
          alert(`Successfully imported ${normalizedWords.length} vocabulary words from JSON!`);
        }

        // Reset file input so same file can be imported again if needed
        event.target.value = "";
      } catch (error) {
        alert(`Error importing vocabulary: ${error instanceof Error ? error.message : "Please check the file format"}`);
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <BookOpen className="size-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading vocabulary...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Vocabulary Management</h2>
            <p className="text-sm text-muted-foreground">
              {vocabularyList.length} words available for students
            </p>
          </div>

          <div className="flex gap-2">
            {teacherView && (
              <>
                <Button onClick={() => setIsCreating(true)} size="sm">
                  <Plus className="size-4 mr-2" />
                  Add Word
                </Button>
                <Button onClick={handleDownloadTemplate} variant="outline" size="sm">
                  <Download className="size-4 mr-2" />
                  CSV Template
                </Button>
                <Button onClick={handleExportVocabulary} variant="outline" size="sm">
                  <Download className="size-4 mr-2" />
                  Export
                </Button>
                <Button onClick={() => document.getElementById("import-vocabulary")?.click()} variant="outline" size="sm">
                  <Upload className="size-4 mr-2" />
                  Import CSV/JSON
                </Button>
                <input
                  id="import-vocabulary"
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={handleImportVocabulary}
                />
              </>
            )}
          </div>
        </div>
      </Card>

      {/* CSV Format Help */}
      <Card className="p-4 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <BookOpen className="size-5 text-blue-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold mb-2">CSV Format Recommended</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Use CSV files for easy editing in Excel, Google Sheets, or any spreadsheet application.
              Format: <code className="px-1 py-0.5 bg-background rounded">word,definition,partOfSpeech,difficulty,language</code>
            </p>
            <p className="text-xs text-muted-foreground">
              Download the CSV Template to see the exact format. Both CSV and JSON imports are supported.
            </p>
          </div>
        </div>
      </Card>

      {/* Search and filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search words or definitions..."
              className="w-full px-3 py-2 border rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            {(["ALL", "easy", "medium", "hard"] as const).map((level) => (
              <Button
                key={level}
                variant={difficultyFilter === level ? "default" : "outline"}
                size="sm"
                onClick={() => setDifficultyFilter(level)}
              >
                {level === "ALL" ? "All Levels" : level.charAt(0).toUpperCase() + level.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Vocabulary list */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filteredVocabulary.map((word) => (
          <Card key={word.id} className="p-4">
            {editingWord?.id === word.id ? (
              // Edit mode
              <WordForm
                word={editingWord}
                onSave={handleSaveWord}
                onCancel={() => setEditingWord(null)}
              />
            ) : (
              // View mode
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{word.word}</h3>
                    <p className="text-sm text-muted-foreground">{word.definition}</p>
                  </div>

                  {teacherView && (
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingWord(word)}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteWord(word.id)}
                      >
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {word.partOfSpeech && (
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10">
                      {word.partOfSpeech}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    word.difficulty === "easy" ? "bg-green-500/10 text-green-500" :
                    word.difficulty === "medium" ? "bg-yellow-500/10 text-yellow-500" :
                    "bg-red-500/10 text-red-500"
                  }`}>
                    {word.difficulty}
                  </span>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Create new word form */}
      {isCreating && (
        <Card className="p-4 border-2 border-primary">
          <h3 className="font-semibold mb-3">Add New Vocabulary Word</h3>
          <WordForm
            word={{
              id: "",
              word: "",
              definition: "",
              partOfSpeech: "",
              difficulty: "medium",
              language: "en",
              learned: false,
            }}
            onSave={handleSaveWord}
            onCancel={() => setIsCreating(false)}
          />
        </Card>
      )}

      {filteredVocabulary.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <BookOpen className="size-8 mx-auto mb-4 opacity-50" />
          <p>No vocabulary words found. {teacherView && "Add some words to get started!"}</p>
        </Card>
      )}
    </div>
  );
}

// Word form component
interface WordFormProps {
  word: VocabularyWord;
  onSave: (word: VocabularyWord) => void;
  onCancel: () => void;
}

function WordForm({ word, onSave, onCancel }: WordFormProps) {
  const [formData, setFormData] = useState<VocabularyWord>(word);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.word.trim() || !formData.definition.trim()) {
      alert("Please fill in the word and definition");
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-sm font-medium">Word</label>
        <input
          type="text"
          className="w-full px-3 py-2 border rounded-md"
          value={formData.word}
          onChange={(e) => setFormData({ ...formData, word: e.target.value.toUpperCase() })}
          placeholder="EPHEMERAL"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Definition</label>
        <textarea
          className="w-full px-3 py-2 border rounded-md"
          value={formData.definition}
          onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
          placeholder="Lasting for a very short time"
          rows={2}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Part of Speech</label>
          <select
            className="w-full px-3 py-2 border rounded-md"
            value={formData.partOfSpeech || ""}
            onChange={(e) => setFormData({ ...formData, partOfSpeech: e.target.value })}
          >
            <option value="">Select...</option>
            <option value="noun">Noun</option>
            <option value="verb">Verb</option>
            <option value="adjective">Adjective</option>
            <option value="adverb">Adverb</option>
            <option value="preposition">Preposition</option>
            <option value="conjunction">Conjunction</option>
            <option value="interjection">Interjection</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Difficulty</label>
          <select
            className="w-full px-3 py-2 border rounded-md"
            value={formData.difficulty}
            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as "easy" | "medium" | "hard" })}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="size-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit">
          <Save className="size-4 mr-2" />
          Save
        </Button>
      </div>
    </form>
  );
}