"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2Icon } from "lucide-react";
import { deleteBook, type DeleteBookState } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DeleteBookDialogProps = {
  workId: string;
  title: string;
};

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      <Trash2Icon />
      {pending ? "Deleting..." : "Delete book"}
    </Button>
  );
}

function DeleteBookForm({
  workId,
  title,
  onDeleted,
}: {
  workId: string;
  title: string;
  onDeleted: () => void;
}) {
  const [state, formAction] = useActionState<DeleteBookState | null, FormData>(
    deleteBook,
    null,
  );

  useEffect(() => {
    if (!state?.ok) return;
    const timer = window.setTimeout(() => {
      onDeleted();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [state, onDeleted]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Delete book?</DialogTitle>
        <DialogDescription>
          This will permanently delete <span className="font-medium text-foreground">{title}</span> and every
          language version attached to it.
        </DialogDescription>
      </DialogHeader>
      {state && !state.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok ? (
        <Alert>
          <AlertDescription>Book deleted successfully.</AlertDescription>
        </Alert>
      ) : null}
      <form action={formAction}>
        <input type="hidden" name="workId" value={workId} />
        <DialogFooter className="mt-2">
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <DeleteSubmitButton />
        </DialogFooter>
      </form>
    </>
  );
}

export function DeleteBookDialog({ workId, title }: DeleteBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setFormKey((key) => key + 1);
        }
      }}
    >
      <DialogTrigger render={<Button type="button" size="sm" variant="destructive" />}>
        <Trash2Icon />
        Delete
      </DialogTrigger>
      <DialogContent>
        <DeleteBookForm
          key={formKey}
          workId={workId}
          title={title}
          onDeleted={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
