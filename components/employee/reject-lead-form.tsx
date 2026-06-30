"use client";



import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { markLeadLost } from "@/lib/actions/leads";

import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";



type RejectLeadFormProps = {

  leadId: string;

  clientName: string;

};



export function RejectLeadForm({ leadId, clientName }: RejectLeadFormProps) {

  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);

  const [reason, setReason] = useState("");



  function handleSubmit(e: React.FormEvent) {

    e.preventDefault();

    startTransition(async () => {

      const result = await markLeadLost({ lead_id: leadId, reason });

      if (!result.success) {

        toast.error(result.error);

        return;

      }

      toast.success("Lead marked as lost");

      router.push("/employee/dashboard");

    });

  }



  if (!open) {

    return (

      <Button

        variant="outline"

        onClick={() => setOpen(true)}

        disabled={isPending}

        className="w-full sm:w-auto"

      >

        Mark as lost / not converted

      </Button>

    );

  }



  return (

    <section className="erp-panel overflow-hidden border-destructive/30">

      <div className="border-b border-destructive/10 bg-destructive/5 px-4 py-4 sm:px-6">

        <h2 className="section-title text-base sm:text-lg">Mark lead as lost</h2>

        <p className="section-subtitle">

          {clientName} will be closed without conversion. A reason is required for records.

        </p>

      </div>

      <div className="p-4 sm:p-6">

        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-2">

            <Label htmlFor="lost-reason">Reason (required)</Label>

            <Textarea

              id="lost-reason"

              value={reason}

              onChange={(e) => setReason(e.target.value)}

              rows={4}

              required

              minLength={10}

              placeholder="e.g. Client not interested, wrong contact details, duplicate lead..."

            />

          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">

            <Button type="submit" variant="destructive" disabled={isPending} className="w-full sm:w-auto">

              {isPending ? "Saving..." : "Confirm lost"}

            </Button>

            <Button

              type="button"

              variant="ghost"

              onClick={() => setOpen(false)}

              disabled={isPending}

              className="w-full sm:w-auto"

            >

              Cancel

            </Button>

          </div>

        </form>

      </div>

    </section>

  );

}

