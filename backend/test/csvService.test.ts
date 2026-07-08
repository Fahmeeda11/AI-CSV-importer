import { describe, expect, it } from "vitest";
import { parseCsv, CsvParseError } from "../src/services/csvService.js";

const buf = (s: string) => Buffer.from(s, "utf8");

describe("parseCsv", () => {
  it("parses headers and rows keyed by original column names", () => {
    const rows = parseCsv(buf("Name,Email\nJohn,john@x.com\nJane,jane@y.com"));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ Name: "John", Email: "john@x.com" });
  });

  it("handles quoted fields with embedded commas and newlines", () => {
    const rows = parseCsv(buf('Name,Note\n"Doe, John","hello\nworld"'));
    expect(rows[0]!.Name).toBe("Doe, John");
    expect(rows[0]!.Note).toBe("hello\nworld");
  });

  it("strips a UTF-8 BOM from the first header", () => {
    const rows = parseCsv(buf("﻿Name,Email\nA,a@b.com"));
    expect(Object.keys(rows[0]!)).toContain("Name");
  });

  it("tolerates ragged rows", () => {
    const rows = parseCsv(buf("A,B,C\n1,2\n3,4,5,6"));
    expect(rows).toHaveLength(2);
  });

  it("names empty headers and de-duplicates repeats", () => {
    const rows = parseCsv(buf("Name,,Name\n1,2,3"));
    const keys = Object.keys(rows[0]!);
    expect(keys).toContain("column_2");
    expect(keys).toContain("Name_2");
  });

  it("drops fully-blank rows", () => {
    const rows = parseCsv(buf("A,B\n1,2\n,\n3,4"));
    expect(rows).toHaveLength(2);
  });

  it("throws on an empty file", () => {
    expect(() => parseCsv(buf("   "))).toThrow(CsvParseError);
  });
});
