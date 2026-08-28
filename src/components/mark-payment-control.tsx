"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TextInput } from "@/components/ui/field";
import { PAYMENT_METHOD_LABELS } from "@/lib/lessons";
import { markPaymentReceived, markPaymentUnpaid } from "@/app/tutor/payments/actions";
import type { Database } from "@/types/database";

type PaymentMethod = Database["public"]["Enums"]["payment_method"];

export function MarkPaymentControl({
  participantId,
  lessonId,
  paymentStatus,
  paymentMethod,
}: {
  participantId: string;
  lessonId: string;
  paymentStatus: "paid" | "unpaid";
  paymentMethod?: PaymentMethod | null;
}) {
  const [isMarking, setIsMarking] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (paymentStatus === "paid") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="confirmed">שולם{paymentMethod ? ` · ${PAYMENT_METHOD_LABELS[paymentMethod]}` : ""}</Badge>
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await markPaymentUnpaid(participantId, lessonId);
            })
          }
        >
          ביטול סימון
        </Button>
      </div>
    );
  }

  if (!isMarking) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="pending">לא שולם</Badge>
        <Button type="button" variant="secondary" className="text-xs" onClick={() => setIsMarking(true)}>
          סימון כשולם
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await markPaymentReceived(participantId, lessonId, formData);
          if (result?.error) setError(result.error);
          else setIsMarking(false);
        });
      }}
    >
      <select
        name="payment_method"
        defaultValue="cash"
        className="rounded-control border border-border bg-background px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
      >
        {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <TextInput name="payment_note" placeholder="הערה (אופציונלי)" className="w-32 text-xs" />
      <Button type="submit" className="text-xs" disabled={isPending}>
        {isPending ? "שומר..." : "אישור"}
      </Button>
      <Button type="button" variant="secondary" className="text-xs" onClick={() => setIsMarking(false)}>
        ביטול
      </Button>
      {error && <p className="w-full text-xs text-status-destructive">{error}</p>}
    </form>
  );
}
