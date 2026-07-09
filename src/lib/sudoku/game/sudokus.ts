import { SimpleSudoku } from "../engine/types";
import { parseSudoku, stringifySudoku } from "../engine/utility";
import { solve } from "../engine/solverAC3";
import { useCallback, useState } from "react";
import {
  BaseCollection,
  Collection,
  CollectionIndex,
  localStorageCollectionRepository,
} from "../database/collections";

export interface SudokuRaw {
  iterations: number;
  sudoku: SimpleSudoku;
  solution: SimpleSudoku;
}

export interface PaginatedSudokus {
  sudokus: SudokuRaw[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// The original super-sudoku app bundled the puzzle .txt files at build time
// via Vite's `?raw` import. This app serves them as static assets under
// public/sudokus/ instead, so we fetch + cache them lazily at runtime.
const BASE_COLLECTION_FILES: Record<BaseCollection, string> = {
  [BaseCollection.Easy]: "/sudokus/easy.txt",
  [BaseCollection.Medium]: "/sudokus/medium.txt",
  [BaseCollection.Hard]: "/sudokus/hard.txt",
  [BaseCollection.Expert]: "/sudokus/expert.txt",
  [BaseCollection.Evil]: "/sudokus/evil.txt",
};

let cachedBaseCollections: Record<BaseCollection, string> | null = null;
let loadingPromise: Promise<Record<BaseCollection, string>> | null = null;

/**
 * Fetches (and caches) all five base puzzle collections. Must be awaited
 * before any of the synchronous helpers below (getSudokusPaginated,
 * getCollections, ...) are used with a base collection id.
 */
export async function loadBaseCollections(): Promise<Record<BaseCollection, string>> {
  if (cachedBaseCollections) {
    return cachedBaseCollections;
  }
  if (loadingPromise) {
    return loadingPromise;
  }
  loadingPromise = (async () => {
    const entries = await Promise.all(
      (Object.keys(BASE_COLLECTION_FILES) as BaseCollection[]).map(async (key) => {
        const res = await fetch(BASE_COLLECTION_FILES[key]);
        if (!res.ok) {
          throw new Error(`Failed to load sudoku collection "${key}": ${res.status}`);
        }
        const text = await res.text();
        return [key, text] as const;
      }),
    );
    const result = Object.fromEntries(entries) as Record<BaseCollection, string>;
    cachedBaseCollections = result;
    return result;
  })();
  return loadingPromise;
}

export function getLoadedBaseCollections(): Record<BaseCollection, string> | null {
  return cachedBaseCollections;
}

function getLineCount(collection: Collection): number {
  return collection.sudokusRaw.split("\n").filter((line) => line.trim()).length;
}

export function getSudokusPaginated(collection: Collection, page: number = 0, pageSize: number = 12): PaginatedSudokus {
  const totalRows = getLineCount(collection);
  const totalPages = Math.ceil(totalRows / pageSize);
  const startIndex = page * pageSize;
  const endIndex = startIndex + pageSize;

  if (collection.sudokusRaw === "") {
    return {
      sudokus: [],
      totalRows: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const rawLines = collection.sudokusRaw.split("\n").filter((line) => line.trim());
  const sudokus: SudokuRaw[] = [];

  for (const line of rawLines.slice(startIndex, endIndex)) {
    const sudoku = parseSudoku(line);
    const solved = solve(sudoku);
    const result = {
      sudoku,
      solution: solved.sudoku,
      iterations: solved.iterations,
    };
    if (result.solution !== null) {
      sudokus.push(result as SudokuRaw);
    } else {
      console.warn("Invalid sudoku: ", sudoku, solved);
    }
  }

  return {
    sudokus,
    totalRows,
    page,
    pageSize,
    totalPages,
  };
}

export const START_SUDOKU_INDEX = 0;

/**
 * Returns the first "easy" puzzle to seed a brand-new game. Requires
 * loadBaseCollections() to have resolved already.
 */
export function getStartSudoku(): { collection: Collection; sudoku: SudokuRaw } {
  const collections = getLoadedBaseCollections();
  if (!collections) {
    throw new Error("getStartSudoku() called before loadBaseCollections() resolved");
  }
  const collection: Collection = { id: "easy", name: "easy", sudokusRaw: collections.easy };
  const sudoku = getSudokusPaginated(collection, START_SUDOKU_INDEX, START_SUDOKU_INDEX + 1).sudokus[0];
  return { collection, sudoku };
}

export function getCollections() {
  const collections = getLoadedBaseCollections();
  const baseCollections = collections ? Object.keys(collections) : Object.values(BaseCollection);
  const savedCollections = localStorageCollectionRepository.getCollections();
  return [...baseCollections.map((collection) => ({ id: collection, name: collection })), ...savedCollections];
}

export function useSudokuCollections() {
  const [collections, setCollections] = useState<CollectionIndex[]>(getCollections());

  const [activeCollectionId, setActiveCollectionId] = useState<string>("easy");

  const isBaseCollection = useCallback((collectionId: string) => {
    return Object.values(BaseCollection).includes(collectionId as BaseCollection);
  }, []);

  const addCollection = useCallback((collection: string) => {
    const collectionId = crypto.randomUUID();
    const newCollection = { id: collectionId, name: collection, sudokusRaw: "" };
    localStorageCollectionRepository.saveCollection(newCollection);
    setCollections(getCollections());
    return newCollection;
  }, []);

  const addSudokuToCollection = useCallback((collectionId: string, sudoku: SimpleSudoku) => {
    const stringifiedSudoku = stringifySudoku(sudoku);
    const collection = localStorageCollectionRepository.getCollection(collectionId);
    const newSudokusRaw =
      collection.sudokusRaw.length > 0 ? collection.sudokusRaw + "\n" + stringifiedSudoku : stringifiedSudoku;
    localStorageCollectionRepository.saveCollection({
      ...collection,
      sudokusRaw: newSudokusRaw,
    });
    setCollections(getCollections());
  }, []);

  const getCollection = useCallback(
    (collectionId: string): Collection => {
      if (isBaseCollection(collectionId)) {
        const loaded = getLoadedBaseCollections();
        return {
          id: collectionId,
          name: collectionId,
          sudokusRaw: loaded ? loaded[collectionId as BaseCollection] : "",
        };
      }
      return localStorageCollectionRepository.getCollection(collectionId);
    },
    [isBaseCollection],
  );

  const activeCollection = getCollection(activeCollectionId);

  const removeCollection = (collectionId: string) => {
    localStorageCollectionRepository.removeCollection(collectionId);
    setCollections(getCollections());
  };

  return {
    collections,
    addCollection,
    removeCollection,
    addSudokuToCollection,
    isBaseCollection,
    getCollection,
    activeCollection,
    setActiveCollectionId,
  };
}
