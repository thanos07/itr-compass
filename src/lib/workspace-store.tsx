"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createEmptyWorkspace, type TaxWorkspace } from "@/lib/workspace-types";
import { parseTaxWorkspace } from "@/lib/workspace-schema";

const STORAGE_KEY = "itr-file-workspace-v2";
const LEGACY_STORAGE_KEY = "itr-file-workspace-v1";

type WorkspaceContextValue = {
  workspace: TaxWorkspace;
  hydrated: boolean;
  update: (recipe: (draft: TaxWorkspace) => TaxWorkspace) => void;
  patch: <K extends keyof TaxWorkspace>(key: K, value: TaxWorkspace[K]) => void;
  reset: () => void;
  importWorkspace: (workspace: TaxWorkspace) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<TaxWorkspace>(() => createEmptyWorkspace());
  const [hydrated, setHydrated] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate the browser-only local workspace after SSR. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const migrated = parseTaxWorkspace(JSON.parse(raw));
        setWorkspace(migrated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {
      // Keep a clean local workspace if previous browser data is corrupted.
    } finally {
      setHydrated(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }, [workspace, hydrated]);

  const update = useCallback((recipe: (draft: TaxWorkspace) => TaxWorkspace) => {
    setWorkspace((current) => ({ ...recipe(structuredClone(current)), updatedAt: new Date().toISOString() }));
  }, []);

  const patch = useCallback(<K extends keyof TaxWorkspace>(key: K, value: TaxWorkspace[K]) => {
    setWorkspace((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  }, []);

  const reset = useCallback(() => {
    const next = createEmptyWorkspace();
    setWorkspace(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const importWorkspace = useCallback((next: TaxWorkspace) => {
    const validated = parseTaxWorkspace(next);
    setWorkspace({ ...validated, updatedAt: new Date().toISOString() });
  }, []);

  const value = useMemo(() => ({ workspace, hydrated, update, patch, reset, importWorkspace }), [workspace, hydrated, update, patch, reset, importWorkspace]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}
