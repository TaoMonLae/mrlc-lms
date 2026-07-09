import React, { createContext, useContext, useReducer, useCallback, ReactNode } from "react";
import {
  localStorageUserPreferencesRepository,
  UserPreferences,
} from "@/src/lib/sudoku/database/userPreferences";

function getInitialGameState(): UserPreferences {
  return localStorageUserPreferencesRepository.getPreferences();
}

export const INITIAL_USER_PREFERENCES_STATE: UserPreferences = getInitialGameState();

const TOGGLE_SHOW_HINTS = "user_preferences/TOGGLE_SHOW_HINTS";
const TOGGLE_SHOW_OCCURRENCES = "user_preferences/TOGGLE_SHOW_OCCURRENCES";
const TOGGLE_SHOW_CONFLICTS = "user_preferences/TOGGLE_SHOW_CONFLICTS";
const TOGGLE_SHOW_CIRCLE_MENU = "user_preferences/TOGGLE_SHOW_CIRCLE_MENU";
const TOGGLE_SHOW_WRONG_ENTRIES = "user_preferences/TOGGLE_SHOW_WRONG_ENTRIES";

type UserPreferencesAction =
  | { type: typeof TOGGLE_SHOW_HINTS }
  | { type: typeof TOGGLE_SHOW_OCCURRENCES }
  | { type: typeof TOGGLE_SHOW_CONFLICTS }
  | { type: typeof TOGGLE_SHOW_CIRCLE_MENU }
  | { type: typeof TOGGLE_SHOW_WRONG_ENTRIES };

function userPreferencesReducer(state: UserPreferences, action: UserPreferencesAction): UserPreferences {
  switch (action.type) {
    case TOGGLE_SHOW_HINTS:
      return { ...state, showHints: !state.showHints };
    case TOGGLE_SHOW_OCCURRENCES:
      return { ...state, showOccurrences: !state.showOccurrences };
    case TOGGLE_SHOW_CONFLICTS:
      return { ...state, showConflicts: !state.showConflicts };
    case TOGGLE_SHOW_CIRCLE_MENU:
      return { ...state, showCircleMenu: !state.showCircleMenu };
    case TOGGLE_SHOW_WRONG_ENTRIES:
      return { ...state, showWrongEntries: !state.showWrongEntries };
    default:
      return state;
  }
}

interface UserPreferencesContextType {
  state: UserPreferences;
  toggleShowHints: () => void;
  toggleShowOccurrences: () => void;
  toggleShowConflicts: () => void;
  toggleShowCircleMenu: () => void;
  toggleShowWrongEntries: () => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

interface UserPreferencesProviderProps {
  children: ReactNode;
  initialState?: UserPreferences;
}

export function UserPreferencesProvider({
  children,
  initialState = INITIAL_USER_PREFERENCES_STATE,
}: UserPreferencesProviderProps) {
  const [state, dispatch] = useReducer(userPreferencesReducer, initialState);
  localStorageUserPreferencesRepository.savePreferences(state);

  const toggleShowHints = useCallback(() => {
    dispatch({ type: TOGGLE_SHOW_HINTS });
  }, []);

  const toggleShowOccurrences = useCallback(() => {
    dispatch({ type: TOGGLE_SHOW_OCCURRENCES });
  }, []);

  const toggleShowConflicts = useCallback(() => {
    dispatch({ type: TOGGLE_SHOW_CONFLICTS });
  }, []);

  const toggleShowCircleMenu = useCallback(() => {
    dispatch({ type: TOGGLE_SHOW_CIRCLE_MENU });
  }, []);

  const toggleShowWrongEntries = useCallback(() => {
    dispatch({ type: TOGGLE_SHOW_WRONG_ENTRIES });
  }, []);

  const value = {
    state,
    toggleShowHints,
    toggleShowOccurrences,
    toggleShowConflicts,
    toggleShowCircleMenu,
    toggleShowWrongEntries,
  };

  return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>;
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error("useUserPreferences must be used within a UserPreferencesProvider");
  }
  return context;
}
