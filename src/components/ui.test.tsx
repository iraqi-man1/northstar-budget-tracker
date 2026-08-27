// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Input, Modal } from "./ui";

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

describe("Modal focus management", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps an input focused when a controlled value rerenders the modal", () => {
    vi.useFakeTimers();
    render(<ControlledModal />);

    act(() => vi.runOnlyPendingTimers());
    const input = screen.getByRole("textbox", { name: "Item name" });
    input.focus();

    fireEvent.change(input, { target: { value: "a" } });
    act(() => vi.runOnlyPendingTimers());

    expect(input).toHaveValue("a");
    expect(input).toHaveFocus();
  });
});
