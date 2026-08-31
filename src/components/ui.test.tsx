// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Input, Modal, MoneyInput } from "./ui";
import { LanguageProvider } from "../context/LanguageContext";
import { useLanguage } from "../context/LanguageContext";

function ControlledModal() {
  const [value, setValue] = useState("");

  return (
    <Modal open onClose={() => undefined} title="Edit item">
      <Input
        aria-label="Item name"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </Modal>
  );
}

function LanguageControl() {
  const { setLanguage, t } = useLanguage();
  return <button onClick={() => setLanguage("ar")}>{t("Settings")}</button>;
}

function ControlledIqdInput() {
  const [value, setValue] = useState("");
  return <MoneyInput currency="IQD" aria-label="IQD amount" value={value} onChange={(event) => setValue(event.target.value)} />;
}

describe("Modal focus management", () => {
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  });

  it("keeps an input focused when a controlled value rerenders the modal", () => {
    vi.useFakeTimers();
    render(<LanguageProvider><ControlledModal /></LanguageProvider>);

    act(() => vi.runOnlyPendingTimers());
    const input = screen.getByRole("textbox", { name: "Item name" });
    input.focus();

    fireEvent.change(input, { target: { value: "a" } });
    act(() => vi.runOnlyPendingTimers());

    expect(input).toHaveValue("a");
    expect(input).toHaveFocus();
  });

  it("switches the document and interface to Arabic RTL", () => {
    render(<LanguageProvider><LanguageControl /></LanguageProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(document.documentElement).toHaveAttribute("lang", "ar");
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("button", { name: "الإعدادات" })).toBeInTheDocument();
  });

  it("groups IQD input values without losing focus", () => {
    render(<LanguageProvider><ControlledIqdInput /></LanguageProvider>);
    const input = screen.getByRole("textbox", { name: "IQD amount" });
    input.focus();

    fireEvent.change(input, { target: { value: "1000000" } });

    expect(input).toHaveValue("1.000.000");
    expect(input).toHaveFocus();
    expect(screen.getByText("IQD")).toBeInTheDocument();
  });
});
