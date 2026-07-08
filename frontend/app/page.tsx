"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { Leaf } from "lucide-react";
import { UploadDropzone } from "@/components/UploadDropzone";
import { PreviewStep } from "@/components/PreviewStep";
import { ProcessingStep } from "@/components/ProcessingStep";
import { ResultStep } from "@/components/ResultStep";
import { ThemeToggle } from "@/components/ThemeToggle";
import { importReducer, initialState } from "@/lib/reducer";
import { parseCsvFile, CsvValidationError } from "@/lib/csv";
import { checkHealth, importCsvStream, ApiError } from "@/lib/api";

export default function Home() {
  const [state, dispatch] = useReducer(importReducer, initialState);
  const [aiReady, setAiReady] = useState(true);
  const fileRef = useRef<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    checkHealth().then((health) => {
      if (!health) {
        setAiReady(false);
        toast.error("Backend is unreachable. Start it and refresh.");
      } else if (!health.aiConfigured) {
        setAiReady(false);
        toast.warning("AI is not configured on the backend (missing OPENAI_API_KEY).");
      } else {
        setAiReady(true);
      }
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    try {
      const parsed = await parseCsvFile(file);
      fileRef.current = file;
      dispatch({ type: "PREVIEW_READY", parsed });
    } catch (err) {
      const message =
        err instanceof CsvValidationError ? err.message : "Could not read that CSV file.";
      toast.error(message);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    const file = fileRef.current;
    if (!file) return;

    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "START_PROCESSING" });

    try {
      let failures = 0;
      for await (const event of importCsvStream(file, controller.signal)) {
        switch (event.type) {
          case "meta":
            dispatch({ type: "META", totalRows: event.totalRows, totalBatches: event.totalBatches });
            break;
          case "batch":
            dispatch({ type: "BATCH", records: event.records, skipped: event.skipped });
            break;
          case "batch_error":
            failures += 1;
            dispatch({ type: "BATCH", records: [], skipped: event.skipped });
            break;
          case "done":
            dispatch({ type: "DONE", summary: event.summary });
            if (failures > 0) {
              toast.warning(`${failures} batch(es) failed and were marked as skipped.`);
            } else {
              toast.success(`Imported ${event.summary.imported} leads.`);
            }
            break;
          case "error":
            throw new ApiError(event.message);
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Import failed.";
      dispatch({ type: "ERROR", message });
      toast.error(message);
    }
  }, []);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    fileRef.current = null;
    dispatch({ type: "RESET" });
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-slate-900 dark:text-white">
                GrowEasy
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">AI CSV Importer</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Import leads from any CSV
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Upload a Facebook, Google Ads, real-estate, or spreadsheet export in any layout.
            Our AI maps the columns into your GrowEasy CRM format automatically.
          </p>
        </div>

        <Stepper phase={state.phase} />

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          {state.phase === "idle" && (
            <UploadDropzone onFile={handleFile} onError={(m) => toast.error(m)} />
          )}

          {state.phase === "previewing" && state.parsed && (
            <PreviewStep
              parsed={state.parsed}
              onConfirm={handleConfirm}
              onCancel={handleReset}
              aiReady={aiReady}
            />
          )}

          {state.phase === "processing" && <ProcessingStep state={state} />}

          {state.phase === "done" && state.summary && (
            <ResultStep
              records={state.records}
              skipped={state.skipped}
              summary={state.summary}
              onReset={handleReset}
            />
          )}

          {state.phase === "error" && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                Something went wrong
              </p>
              <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{state.error}</p>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Start over
              </button>
            </div>
          )}
        </section>

        <footer className="mt-10 text-center text-xs text-slate-400 dark:text-slate-600">
          GrowEasy CSV Importer · Built with Next.js, Express &amp; OpenAI
        </footer>
      </main>
    </div>
  );
}

function Stepper({ phase }: { phase: string }) {
  const steps = [
    { key: "idle", label: "Upload" },
    { key: "previewing", label: "Preview" },
    { key: "processing", label: "Extract" },
    { key: "done", label: "Result" },
  ];
  const order = ["idle", "previewing", "processing", "done"];
  const current = order.indexOf(phase === "error" ? "processing" : phase);

  return (
    <div className="mx-auto flex max-w-xl items-center justify-between">
      {steps.map((step, i) => {
        const active = i <= current;
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${
                  active
                    ? "bg-brand-600 text-white"
                    : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  active ? "text-brand-700 dark:text-brand-300" : "text-slate-400 dark:text-slate-600"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 rounded transition ${
                  i < current ? "bg-brand-500" : "bg-slate-200 dark:bg-slate-800"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
