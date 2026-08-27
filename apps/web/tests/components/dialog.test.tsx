import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "@/components/ui/dialog";

function DialogWrapper({
  initialOpen = false,
  onOpenChange,
}: {
  initialOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(initialOpen);
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <div>
      <button data-testid="trigger-btn" onClick={() => handleOpenChange(true)}>
        Open Dialog
      </button>
      <Dialog open={open} onOpenChange={handleOpenChange} title="Test Dialog">
        <div>
          <p>Dialog Content</p>
          <button data-testid="inside-btn-1">Action 1</button>
          <button data-testid="inside-btn-2">Action 2</button>
        </div>
      </Dialog>
    </div>
  );
}

describe("components/ui/dialog.tsx", () => {
  it("does not render when open=false", () => {
    render(<Dialog open={false} onOpenChange={() => {}} title="Test Dialog">Content</Dialog>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders children and title when open=true", () => {
    render(<Dialog open={true} onOpenChange={() => {}} title="Test Dialog"><p>Dialog Content</p></Dialog>);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Test Dialog")).toBeInTheDocument();
    expect(screen.getByText("Dialog Content")).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Escape is pressed", async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();
    render(<Dialog open={true} onOpenChange={handleOpenChange} title="Test Dialog">Content</Dialog>);

    await user.keyboard("{Escape}");
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it("traps focus inside the dialog when tabbing", async () => {
    const user = userEvent.setup();
    render(<DialogWrapper initialOpen={true} />);

    const closeBtn = screen.getByRole("button", { name: /close dialog/i });
    const action1 = screen.getByTestId("inside-btn-1");
    const action2 = screen.getByTestId("inside-btn-2");

    // Initially when dialog opens, focus is placed on the panel element.
    // Pressing Tab moves focus to the first focusable element inside (close button or action 1 depending on tab order).
    action2.focus();
    expect(document.activeElement).toBe(action2);

    // Tabbing from last focusable element wraps back to the first focusable element (close button)
    await user.tab();
    expect(document.activeElement).toBe(closeBtn);

    await user.tab();
    expect(document.activeElement).toBe(action1);

    await user.tab();
    expect(document.activeElement).toBe(action2);
  });

  it("returns focus to trigger element on close", async () => {
    const user = userEvent.setup();
    render(<DialogWrapper initialOpen={false} />);

    const triggerBtn = screen.getByTestId("trigger-btn");
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    // Open dialog by clicking trigger
    await user.click(triggerBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Close dialog via Escape key
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Focus is restored to trigger button
    expect(document.activeElement).toBe(triggerBtn);
  });
});
