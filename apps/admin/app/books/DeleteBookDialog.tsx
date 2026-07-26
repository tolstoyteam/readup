"use client";

import { useFormStatus } from "react-dom";
import { Trash2Icon } from "lucide-react";
import { deleteBook } from "./actions";
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

export function DeleteBookDialog({ workId, title }: DeleteBookDialogProps) {
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" size="sm" variant="destructive" />}>
        <Trash2Icon />
        Delete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete book?</DialogTitle>
          <DialogDescription>
            This will permanently delete <span className="font-medium text-foreground">{title}</span> and every
            language version attached to it.
          </DialogDescription>
        </DialogHeader>
        <form action={deleteBook}>
          <input type="hidden" name="workId" value={workId} />
          <DialogFooter className="mt-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <DeleteSubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
