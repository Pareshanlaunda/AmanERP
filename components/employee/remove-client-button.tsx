"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { archiveClient } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";

export function RemoveClientButton({
  clientId,
  clientName,
  onRemoved,
}: {
  clientId: string;
  clientName: string;
  onRemoved?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !window.confirm(
        `Remove ${clientName} from My clients?\n\nCLID, notices, and lead history stay saved. Admin can still see this client.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await archiveClient(clientId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Client removed from dashboard — history kept");
      onRemoved?.();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={handleClick}
      className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      {isPending ? "Removing…" : "Remove"}
    </Button>
  );
}
