import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ResultStep } from "@/components/ResultStep";
import { CRM_FIELDS, type CrmRecord } from "@/lib/types";

const blank = (): CrmRecord =>
  Object.fromEntries(CRM_FIELDS.map((f) => [f, ""])) as CrmRecord;

const summary = { totalRows: 2, imported: 1, skipped: 1, batches: 1, failedBatches: 0 };

function setup() {
  return render(
    <ResultStep
      records={[{ data: { ...blank(), name: "Alice", email: "a@x.com" }, confidence: 92 }]}
      skipped={[
        {
          rowIndex: 1,
          reason: "No email or mobile number found.",
          raw: { name: "Bob" },
          data: { ...blank(), name: "Bob" },
          confidence: 0,
        },
      ]}
      summary={summary}
      onReset={() => {}}
    />
  );
}

describe("ResultStep", () => {
  it("renders summary cards, tabs, legend, and download without crashing", () => {
    setup();
    expect(screen.getByText("Imported (1)")).toBeInTheDocument();
    expect(screen.getByText("Skipped (1)")).toBeInTheDocument();
    expect(screen.getByText("Avg. Confidence")).toBeInTheDocument();
    expect(screen.getByText("Download CRM CSV")).toBeInTheDocument();
    // Confidence legend present
    expect(screen.getByText(/High ≥80/)).toBeInTheDocument();
  });

  it("switches to the skipped tab and shows the Reason column", () => {
    setup();
    fireEvent.click(screen.getByText("Skipped (1)"));
    expect(screen.getByText("Reason")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
  });
});
