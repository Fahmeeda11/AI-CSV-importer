import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataTable } from "@/components/DataTable";

describe("DataTable", () => {
  it("renders column headers", () => {
    render(
      <DataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
        ]}
        rows={[{ name: "John", email: "john@x.com" }]}
      />
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("shows the empty state when there are no rows", () => {
    render(<DataTable columns={[{ key: "a", label: "A" }]} rows={[]} emptyText="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});
