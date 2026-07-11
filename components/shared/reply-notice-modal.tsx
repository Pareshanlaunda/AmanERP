"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getClientNoticeDefaults,
  saveClientNotice,
  type NoticeDefaults,
} from "@/lib/actions/notices";
import { NOTICE_REASON_OPTIONS } from "@/lib/notices/reason-options";
import { ACTIVE_NOTICE_TEMPLATE_TYPES } from "@/lib/notices/template-types";
import { getTemplateFieldConfig } from "@/lib/notices/template-fields";
import { DEFAMATION_CRIMINAL_CHARGES_RS } from "@/lib/notices/defamation-constants";
import { LOAN_RECALL_AGENT_BEHAVIOR_TEXT } from "@/lib/notices/loan-recall-constants";
import { stripClidRefSuffix } from "@/lib/notices/format-notice-date";
import type { ClientOnboarding } from "@/lib/validations/onboarding";

type Props = {
  client: ClientOnboarding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (noticeId: string) => void;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultExpiryIso() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function ReplyNoticeModal({ client, open, onOpenChange, onSaved }: Props) {
  const [mounted, setMounted] = useState(false);
  const [defaults, setDefaults] = useState<NoticeDefaults | null>(null);
  const [isPending, startTransition] = useTransition();

  const [noticeNo, setNoticeNo] = useState("");
  const [noticeDate, setNoticeDate] = useState(todayIso());
  const [expiryDate, setExpiryDate] = useState(defaultExpiryIso());
  const [templateType, setTemplateType] = useState<string>("");
  const [loanIdBearingNo, setLoanIdBearingNo] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const [replyToName, setReplyToName] = useState("");
  const [replyToAddress, setReplyToAddress] = useState("");
  const [reasonKeys, setReasonKeys] = useState<string[]>([]);
  const [additionalReason, setAdditionalReason] = useState("");
  const [copyToAdvocate, setCopyToAdvocate] = useState(true);
  const [copyToAdvocateName, setCopyToAdvocateName] = useState("");
  const [copyToAdvocateAddress, setCopyToAdvocateAddress] = useState("");
  const [referenceOnNotice, setReferenceOnNotice] = useState("");
  const [signatureMode, setSignatureMode] = useState<"digital" | "manual">("digital");
  const [enableDates, setEnableDates] = useState(false);
  const [clientRo, setClientRo] = useState("");
  const [loanOfRs, setLoanOfRs] = useState("");
  const [emisAmountingToRs, setEmisAmountingToRs] = useState("");
  const [agentBehavior, setAgentBehavior] = useState(false);
  const [intimationMailDate, setIntimationMailDate] = useState("");

  const fieldConfig = getTemplateFieldConfig(templateType);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setTemplateType("");
    setReasonKeys([]);
    setAdditionalReason("");
    startTransition(async () => {
      const result = await getClientNoticeDefaults(client.id);
      if (!result.success || !result.data) {
        toast.error(result.success === false ? result.error : "Failed to load client");
        return;
      }
      setDefaults(result.data);
      // Form REF = plain CLID (/MON/YYYY only on generated doc)
      if (result.data.client_id) {
        setRefNumber(stripClidRefSuffix(result.data.client_id));
      }
    });
  }, [open, client.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function fillDetails() {
    if (!defaults) {
      toast.error("Client details not loaded yet");
      return;
    }
    const clid = defaults.client_id?.replace(/^CLID-?/i, "") ?? "";
    const month = new Date(noticeDate + "T12:00:00")
      .toLocaleString("en-US", { month: "short" })
      .toUpperCase();
    const year = new Date(noticeDate + "T12:00:00").getFullYear();
    if (!noticeNo.trim() && clid) {
      setNoticeNo(`CT${clid}/${month}/${year}`);
    }
    if (defaults.client_id) {
      setRefNumber(stripClidRefSuffix(defaults.client_id));
    }
    if (copyToAdvocate && !copyToAdvocateName.trim()) {
      setCopyToAdvocateName(defaults.signing_advocate_name);
    }
    // Defamation / shared money fields from client record
    if (defaults.loan_amount != null) {
      setLoanOfRs(String(defaults.loan_amount));
    }
    if (defaults.previous_monthly_emi != null) {
      setEmisAmountingToRs(String(defaults.previous_monthly_emi));
    }
    toast.success("Filled available client details");
  }

  function toggleReason(key: string) {
    setReasonKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function handleSave() {
    if (!templateType) {
      toast.error("Select a Template Type");
      return;
    }
    if (!noticeNo.trim()) {
      toast.error("Notice No is required");
      return;
    }
    if (!noticeDate || !expiryDate) {
      toast.error("Notice Date and Expiry Date are required");
      return;
    }
    if (!loanIdBearingNo.trim()) {
      toast.error(`${fieldConfig?.loanIdLabel ?? "Loan ID"} is required`);
      return;
    }
    if (!replyToName.trim() || !replyToAddress.trim()) {
      toast.error(
        `${fieldConfig?.replyToNameLabel ?? "Reply To Name"} and Address are required`
      );
      return;
    }
    if (fieldConfig?.showRefNumber && !refNumber.trim() && !defaults?.client_id) {
      toast.error("Ref Number is required");
      return;
    }
    if (fieldConfig?.showReferenceOnNotice && !referenceOnNotice.trim()) {
      toast.error("Reference number on the notice received is required");
      return;
    }
    if (
      fieldConfig?.showCopyToAdvocate &&
      copyToAdvocate &&
      (!copyToAdvocateName.trim() || !copyToAdvocateAddress.trim())
    ) {
      toast.error("Copy To Advocate name and address are required");
      return;
    }
    if (fieldConfig?.showDefamationFields) {
      if (!clientRo.trim()) {
        toast.error("Client R/O is required");
        return;
      }
      if (!loanOfRs.trim()) {
        toast.error("loan of Rs is required");
        return;
      }
      if (!emisAmountingToRs.trim()) {
        toast.error("EMI's amounting to Rs is required");
        return;
      }
    }
    if (fieldConfig?.showIntimationMailDate && !intimationMailDate) {
      toast.error("Intimation Mail Date is required");
      return;
    }

    const resolvedRef = defaults?.client_id
      ? stripClidRefSuffix(defaults.client_id)
      : stripClidRefSuffix(refNumber.trim() || noticeNo.trim());

    startTransition(async () => {
      const result = await saveClientNotice({
        client_onboarding_id: client.id,
        template_type: templateType as (typeof ACTIVE_NOTICE_TEMPLATE_TYPES)[number],
        notice_no: noticeNo,
        notice_date: noticeDate,
        expiry_date: expiryDate,
        loan_id_bearing_no: loanIdBearingNo,
        ref_number: resolvedRef,
        reply_to_name: replyToName,
        reply_to_address: replyToAddress,
        reason_keys: fieldConfig?.showReasons ? reasonKeys : [],
        additional_reason: fieldConfig?.showReasons ? additionalReason || null : null,
        copy_to_advocate: fieldConfig?.showCopyToAdvocate ? copyToAdvocate : false,
        copy_to_advocate_name:
          fieldConfig?.showCopyToAdvocate && copyToAdvocate
            ? copyToAdvocateName || null
            : null,
        copy_to_advocate_address:
          fieldConfig?.showCopyToAdvocate && copyToAdvocate
            ? copyToAdvocateAddress || null
            : null,
        reference_number_on_notice: fieldConfig?.showReferenceOnNotice
          ? referenceOnNotice
          : resolvedRef,
        signature_mode: signatureMode,
        enable_dates: enableDates,
        client_ro: fieldConfig?.showDefamationFields ? clientRo : null,
        loan_of_rs: fieldConfig?.showDefamationFields ? loanOfRs : null,
        emis_amounting_to_rs: fieldConfig?.showDefamationFields ? emisAmountingToRs : null,
        criminal_charges_payment_rs: fieldConfig?.showDefamationFields
          ? DEFAMATION_CRIMINAL_CHARGES_RS
          : null,
        agent_behavior: fieldConfig?.showAgentBehavior ? agentBehavior : false,
        intimation_mail_date: fieldConfig?.showIntimationMailDate
          ? intimationMailDate
          : null,
      });

      if (!result.success || !result.data) {
        toast.error(result.success === false ? result.error : "Save failed");
        return;
      }

      onSaved?.(result.data.noticeId);
      toast.success("Reply notice saved");
      onOpenChange(false);
    });
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reply-notice-title"
        className="relative my-4 w-full max-w-3xl rounded-xl border bg-card shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-5 py-4">
          <h2 id="reply-notice-title" className="text-lg font-semibold">
            Reply Notice
          </h2>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fillDetails}
              disabled={isPending}
            >
              Fill details
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          {defaults ? (
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Client:{" "}
              <span className="font-medium text-foreground">{defaults.client_name}</span>
              {" · "}
              Signing advocate:{" "}
              <span className="font-medium text-foreground">
                {defaults.signing_advocate_name}
              </span>
              {defaults.signing_advocate_mobile
                ? ` · ${defaults.signing_advocate_mobile}`
                : null}
              {defaults.advocate_source === "onboarding_fallback" ? (
                <span className="ml-1 text-amber-700 dark:text-amber-400">
                  (no advocate additional assignee — using onboarding name)
                </span>
              ) : null}
              {defaults.client_id ? (
                <span className="block mt-1">
                  REF (CLID):{" "}
                  <span className="font-medium text-foreground">
                    {stripClidRefSuffix(defaults.client_id)}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · /MON/YYYY added on document only
                  </span>
                </span>
              ) : null}
              {defaults.loan_amount != null ? (
                <span className="block mt-1">
                  Loan amount:{" "}
                  <span className="font-medium text-foreground">{defaults.loan_amount}</span>
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Shared header fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="notice_no">
                Notice No<span className="text-destructive">*</span>
              </Label>
              <Input
                id="notice_no"
                placeholder="Notice No"
                value={noticeNo}
                onChange={(e) => setNoticeNo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notice_date">
                Notice Date<span className="text-destructive">*</span>
              </Label>
              <Input
                id="notice_date"
                type="date"
                value={noticeDate}
                onChange={(e) => setNoticeDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">
                Expiry Date<span className="text-destructive">*</span>
              </Label>
              <Input
                id="expiry_date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Template Type<span className="text-destructive">*</span>
              </Label>
              <Select
                value={templateType || undefined}
                onValueChange={(value) => {
                  const cfg = getTemplateFieldConfig(value);
                  setTemplateType(value);
                  setReasonKeys([]);
                  setAdditionalReason("");
                  setCopyToAdvocate(cfg?.copyToDefaultOn ?? true);
                  setCopyToAdvocateName("");
                  setCopyToAdvocateAddress("");
                  setReferenceOnNotice("");
                  setSignatureMode("digital");
                  setEnableDates(false);
                  setClientRo("");
                  setAgentBehavior(false);
                  setIntimationMailDate("");
                  if (cfg?.showDefamationFields && defaults) {
                    if (defaults.client_id) {
                      setRefNumber(stripClidRefSuffix(defaults.client_id));
                    }
                    setLoanOfRs(
                      defaults.loan_amount != null ? String(defaults.loan_amount) : ""
                    );
                    setEmisAmountingToRs(
                      defaults.previous_monthly_emi != null
                        ? String(defaults.previous_monthly_emi)
                        : ""
                    );
                  } else {
                    setLoanOfRs("");
                    setEmisAmountingToRs("");
                    if (defaults?.client_id && cfg?.showRefNumber !== false) {
                      setRefNumber(stripClidRefSuffix(defaults.client_id));
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Please select template type" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVE_NOTICE_TEMPLATE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="loan_id">
                {fieldConfig?.loanIdLabel ?? "Loan ID Bearing No"}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loan_id"
                placeholder={fieldConfig?.loanIdLabel ?? "Loan ID Bearing No"}
                value={loanIdBearingNo}
                onChange={(e) => setLoanIdBearingNo(e.target.value)}
              />
            </div>
            {fieldConfig?.showRefNumber !== false ? (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ref_number">
                  Ref Number (CLID)<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ref_number"
                  placeholder="Client CLID"
                  value={refNumber}
                  readOnly
                  className="bg-muted/40"
                />
                <p className="text-xs text-muted-foreground">
                  Document adds /MON/YYYY (IST) when generated — not stored on the form.
                </p>
              </div>
            ) : null}
          </div>

          {/* Lender / reply-to — after template so labels match */}
          {fieldConfig ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="reply_to_name">
                  {fieldConfig.replyToNameLabel}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reply_to_name"
                  placeholder={fieldConfig.replyToNameLabel}
                  rows={2}
                  value={replyToName}
                  onChange={(e) => setReplyToName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reply_to_address">
                  {fieldConfig.replyToAddressLabel}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reply_to_address"
                  placeholder={fieldConfig.replyToAddressLabel}
                  rows={3}
                  value={replyToAddress}
                  onChange={(e) => setReplyToAddress(e.target.value)}
                />
              </div>
            </>
          ) : null}

          {!fieldConfig ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              Please select template type to continue.
            </p>
          ) : (
            <>
              {fieldConfig.showCopyToAdvocate ? (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={copyToAdvocate}
                      onChange={(e) => setCopyToAdvocate(e.target.checked)}
                    />
                    {fieldConfig.copyToCheckboxLabel}
                    {copyToAdvocate ? <span className="text-primary">Yes</span> : null}
                  </label>
                  {copyToAdvocate ? (
                    <>
                      <Textarea
                        placeholder={fieldConfig.copyToNameLabel}
                        rows={2}
                        value={copyToAdvocateName}
                        onChange={(e) => setCopyToAdvocateName(e.target.value)}
                      />
                      <Textarea
                        placeholder={fieldConfig.copyToAddressLabel}
                        rows={2}
                        value={copyToAdvocateAddress}
                        onChange={(e) => setCopyToAdvocateAddress(e.target.value)}
                      />
                    </>
                  ) : null}
                </div>
              ) : null}

              {fieldConfig.showReasons ? (
                <div className="space-y-3">
                  <Label>
                    Additional Reason<span className="text-destructive">*</span>
                  </Label>
                  {NOTICE_REASON_OPTIONS.map((opt) => (
                    <label key={opt.key} className="flex gap-3 text-sm leading-snug">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0"
                        checked={reasonKeys.includes(opt.key)}
                        onChange={() => toggleReason(opt.key)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                  <Textarea
                    placeholder="Additional Reason"
                    rows={3}
                    value={additionalReason}
                    onChange={(e) => setAdditionalReason(e.target.value)}
                  />
                </div>
              ) : null}

              {fieldConfig.showDefamationFields ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_ro">
                      Client R/O<span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="client_ro"
                      placeholder="Client R/O"
                      rows={3}
                      value={clientRo}
                      onChange={(e) => setClientRo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loan_of_rs">
                      loan of Rs<span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="loan_of_rs"
                      placeholder="e.g. 328610"
                      value={loanOfRs}
                      onChange={(e) => setLoanOfRs(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emis_rs">
                      EMI&apos;s amounting to Rs<span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="emis_rs"
                      placeholder="e.g. 15526"
                      value={emisAmountingToRs}
                      onChange={(e) => setEmisAmountingToRs(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>criminal charges payment of the Rs</Label>
                    <Input
                      value={DEFAMATION_CRIMINAL_CHARGES_RS}
                      readOnly
                      className="bg-muted/40"
                    />
                    <p className="text-xs text-muted-foreground">
                      Fixed at ₹{DEFAMATION_CRIMINAL_CHARGES_RS} for this template.
                    </p>
                  </div>
                </div>
              ) : null}

              {fieldConfig.showReferenceOnNotice ? (
                <div className="space-y-2">
                  <Label htmlFor="ref_on_notice">
                    REFERENCE NUMBER ON THE NOTICE RECEIVED
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="ref_on_notice"
                    placeholder="REFERENCE NUMBER ON THE NOTICE RECEIVED"
                    rows={2}
                    value={referenceOnNotice}
                    onChange={(e) => setReferenceOnNotice(e.target.value)}
                  />
                </div>
              ) : null}

              {fieldConfig.showAgentBehavior ? (
                <label className="flex gap-3 text-sm leading-snug">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0"
                    checked={agentBehavior}
                    onChange={(e) => setAgentBehavior(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium">Agent Behavior</span>
                    <span className="mt-1 block text-muted-foreground">
                      {LOAN_RECALL_AGENT_BEHAVIOR_TEXT}
                    </span>
                  </span>
                </label>
              ) : null}

              {fieldConfig.showIntimationMailDate ? (
                <div className="space-y-2">
                  <Label htmlFor="intimation_mail_date">
                    Intimation Mail Date<span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="intimation_mail_date"
                    type="date"
                    value={intimationMailDate}
                    onChange={(e) => setIntimationMailDate(e.target.value)}
                  />
                </div>
              ) : null}

              {fieldConfig.showSignature ? (
                <div className="flex flex-wrap items-center gap-6">
                  <div className="space-y-2">
                    <Label>
                      Signature<span className="text-destructive">*</span>
                    </Label>
                    <div className="flex gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="signature_mode"
                          checked={signatureMode === "digital"}
                          onChange={() => setSignatureMode("digital")}
                        />
                        Digital Signature
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="signature_mode"
                          checked={signatureMode === "manual"}
                          onChange={() => setSignatureMode("manual")}
                        />
                        Manual Signature
                      </label>
                    </div>
                  </div>
                  {fieldConfig.showReasons ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={enableDates}
                        onChange={(e) => setEnableDates(e.target.checked)}
                      />
                      Option For Para-2: Enable Dates
                    </label>
                  ) : null}
                </div>
              ) : null}

              <div className="flex justify-center border-t pt-4">
                <Button
                  type="button"
                  className="min-w-[12rem] bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={isPending}
                  onClick={handleSave}
                >
                  {isPending ? "Saving…" : "Save Reply"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
