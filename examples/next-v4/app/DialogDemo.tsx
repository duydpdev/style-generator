"use client";

import { useState } from "react";

import { Button, Dialog, Stack, Text } from "./ui";

/**
 * Client island: the app owns the open state; `Dialog` renders the overlay
 * and the panel only while `open` is true.
 * @returns The dialog trigger and the dialog.
 */
export function DialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <Stack align="start" gap={3}>
      <Text as="h2" type="text20Semibold">
        Dialog
      </Text>
      <Text type="text14Regular" color="muted">
        The app owns the open state; Dialog renders the overlay and the panel.
      </Text>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        Open dialog
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        size="sm"
      >
        <Text as="h2" type="text20Semibold">
          Dialog
        </Text>
        <Text type="text14Regular" color="muted">
          Close it with the button below.
        </Text>
        <Button
          size="sm"
          onClick={() => {
            setOpen(false);
          }}
        >
          Close
        </Button>
      </Dialog>
    </Stack>
  );
}
