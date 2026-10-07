"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Filter, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toCsvCell } from "@/lib/csv";

type SubmissionTab = "all" | "onboarding" | "support";
type DateFilters = { fromDate: string; toDate: string };
export type SubmissionRow = {
  id: number;
  submissionType: "onboarding" | "support";
  firstName: string;
  lastName: string | null;
  email: string;
  companyName: string;
  formStatus: string;
  googleProfileStatus: string | null;
  googleAccessStatus: string | null;
  supportTopic: string | null;
  message: string | null;
  submittedAt: string;
};

const tabCopy: Record<SubmissionTab, { label: string; title: string; description: string; exportName: string }> = {
  all: {
    label: "All leads",
    title: "All leads",
    description: "Every BOOST onboarding and support submission, newest first. This view defaults to all time.",
    exportName: "boost-all-leads",
  },
  onboarding: {
    label: "Onboarding submissions",
    title: "Onboarding submissions",
    description: "Review new BOOST onboarding records and identify accounts ready for fulfillment.",
    exportName: "boost-onboarding-submissions",
  },
  support: {
    label: "Support requests",
    title: "Support form submissions",
    description: "Review and route customer help requests submitted through the BOOST support form.",
    exportName: "boost-support-requests",
  },
};

function displayStatus(value: string | null) {
  return value ? value.replaceAll("_", " ") : "Not applicable";
}

function submissionLabel(type: SubmissionRow["submissionType"]) {
  return type === "onboarding" ? "Onboarding" : "Support";
}

function useSubmissions(activeTab: SubmissionTab, filters: DateFilters) {
  const [data, setData] = useState<SubmissionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (activeTab !== "all") params.set("submissionType", activeTab);
    if (filters.fromDate) params.set("fromDate", filters.fromDate);
    if (filters.toDate) params.set("toDate", filters.toDate);
    setIsLoading(true);
    setError(null);
    fetch(`/api/submissions?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 404 ? "Your session has expired. Refresh the page and sign in again." : "We could not load submissions. Please try again.");
        return (await response.json()) as { rows: SubmissionRow[] };
      })
      .then(result => setData(result.rows))
      .catch(requestError => { if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "We could not load submissions."); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [activeTab, filters.fromDate, filters.toDate, reloadKey]);

  const refetch = useCallback(() => setReloadKey(key => key + 1), []);
  return { data, error, isLoading, refetch };
}

export default function LeadsDashboard() {
  const [activeTab, setActiveTab] = useState<SubmissionTab>("all");
  const [draft, setDraft] = useState<DateFilters>({ fromDate: "", toDate: "" });
  const [filters, setFilters] = useState<DateFilters>({ fromDate: "", toDate: "" });
  const query = useSubmissions(activeTab, filters);
  const rows = query.data ?? [];
  const copy = tabCopy[activeTab];
  const dateScope = filters.fromDate || filters.toDate ? "Date filtered" : "All time";

  const summary = useMemo(() => ({
    total: rows.length,
    ready: rows.filter(row => row.formStatus === "ready_for_fulfillment").length,
    supportNeeded: rows.filter(row => row.formStatus === "support_needed").length,
    googleHelp: rows.filter(row => (row.supportTopic ?? "").toLowerCase().includes("google")).length,
    onboardingHelp: rows.filter(row => row.supportTopic === "Onboarding form").length,
  }), [rows]);

  const exportCsv = () => {
    const header = activeTab === "support"
      ? ["ID", "Submitted", "Name", "Company", "Email", "Support category", "Message"]
      : ["ID", "Submission type", "Submitted", "Name", "Company", "Email", "Form status", "Google profile status", "Google access status", "Support topic", "Message"];
    const body = rows.map(row => activeTab === "support"
      ? [row.id, new Date(row.submittedAt).toLocaleString(), `${row.firstName} ${row.lastName ?? ""}`.trim(), row.companyName, row.email, row.supportTopic, row.message]
      : [row.id, submissionLabel(row.submissionType), new Date(row.submittedAt).toLocaleString(), `${row.firstName} ${row.lastName ?? ""}`.trim(), row.companyName, row.email, row.formStatus, row.googleProfileStatus, row.googleAccessStatus, row.supportTopic, row.message]
    );
    const csv = [header, ...body].map(row => row.map(toCsvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${copy.exportName}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <section className="leads-page">
      <div className="leads-title">
        <div>
          <p className="eyebrow">INTERNAL REVIEW DESK</p>
          <h1>BOOST submissions</h1>
          <p>Start with every lead, then move into onboarding or support queues when a focused review is needed.</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => query.refetch()}><RefreshCw size={16}/> Refresh</button>
      </div>

      <div className="submission-tabs" role="tablist" aria-label="Submission queues">
        {(Object.keys(tabCopy) as SubmissionTab[]).map(tab => <button
          key={tab}
          id={`${tab}-tab`}
          role="tab"
          type="button"
          aria-selected={activeTab === tab}
          aria-controls="submission-panel"
          className={activeTab === tab ? "active" : ""}
          onClick={() => setActiveTab(tab)}
        >{tabCopy[tab].label}</button>)}
      </div>

      <div id="submission-panel" role="tabpanel" aria-labelledby={`${activeTab}-tab`}>
        <div className="queue-heading"><div><h2>{copy.title}</h2><p>{copy.description}</p></div><span>{rows.length} record{rows.length === 1 ? "" : "s"} · {dateScope}</span></div>
        <div className="summary-row">
          {activeTab === "support" ? <>
            <div><span>Total support requests</span><b>{summary.total}</b></div>
            <div><span>Google profile help</span><b>{summary.googleHelp}</b></div>
            <div><span>Onboarding form help</span><b>{summary.onboardingHelp}</b></div>
          </> : <>
            <div><span>{activeTab === "all" ? "Total leads" : "Total onboarding records"}</span><b>{summary.total}</b></div>
            <div><span>Ready for fulfillment</span><b>{summary.ready}</b></div>
            <div><span>Support needed</span><b>{summary.supportNeeded}</b></div>
          </>}
        </div>

        <div className="filters">
          <label><span>From date</span><input type="date" value={draft.fromDate} onChange={e => setDraft({ ...draft, fromDate: e.target.value })} /></label>
          <label><span>To date</span><input type="date" value={draft.toDate} onChange={e => setDraft({ ...draft, toDate: e.target.value })} /></label>
          <button type="button" className="filter-button" onClick={() => setFilters(draft)}><Filter size={16}/> Apply dates</button>
          <button type="button" className="export-button" onClick={exportCsv} disabled={!rows.length}><Download size={16}/> Export CSV</button>
        </div>

        {query.isLoading ? <div className="table-state">Loading {activeTab === "all" ? "all leads" : activeTab === "support" ? "support requests" : "onboarding submissions"}...</div>
          : query.error ? <div className="table-state error">{query.error}</div>
          : activeTab === "all" ? <AllLeadsTable rows={rows} /> : activeTab === "onboarding" ? <OnboardingTable rows={rows} /> : <SupportTable rows={rows} />}
      </div>
    </section>;
}

function AllLeadsTable({ rows }: { rows: SubmissionRow[] }) {
  return <div className="table-wrap"><table className="leads-table"><thead><tr><th>Received</th><th>Type</th><th>Company</th><th>Contact</th><th>Form status</th><th>Google or support status</th><th>Business profile</th></tr></thead><tbody>{rows.length ? rows.map(row => <tr key={row.id}><td>{new Date(row.submittedAt).toLocaleDateString()}<small>{new Date(row.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></td><td><span className={`type-chip ${row.submissionType}`}>{submissionLabel(row.submissionType)}</span></td><td><b>{row.companyName}</b></td><td><a href={`mailto:${row.email}`}>{row.firstName} {row.lastName}</a><small>{row.email}</small></td><td><span className={`status-chip ${row.formStatus}`}>{displayStatus(row.formStatus)}</span></td><td><span className="status-text">{row.submissionType === "support" ? row.supportTopic ?? "Support request" : displayStatus(row.googleAccessStatus)}</span></td><td><ProfileLink id={row.id} /></td></tr>) : <EmptyRow columns={7} message="No leads have been submitted yet. New onboarding and support form submissions will appear here automatically." />}</tbody></table></div>;
}

function OnboardingTable({ rows }: { rows: SubmissionRow[] }) {
  return <div className="table-wrap"><table className="leads-table"><thead><tr><th>Received</th><th>Company</th><th>Contact</th><th>Google access</th><th>Form status</th><th>Business profile</th></tr></thead><tbody>{rows.length ? rows.map(row => <tr key={row.id}><td>{new Date(row.submittedAt).toLocaleDateString()}<small>{new Date(row.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></td><td><b>{row.companyName}</b></td><td><a href={`mailto:${row.email}`}>{row.firstName} {row.lastName}</a><small>{row.email}</small></td><td><span className="status-text">{displayStatus(row.googleAccessStatus)}</span></td><td><span className={`status-chip ${row.formStatus}`}>{displayStatus(row.formStatus)}</span></td><td><ProfileLink id={row.id} /></td></tr>) : <EmptyRow columns={6} message="No onboarding submissions match the active date filters." />}</tbody></table></div>;
}

function SupportTable({ rows }: { rows: SubmissionRow[] }) {
  return <div className="table-wrap"><table className="leads-table"><thead><tr><th>Received</th><th>Company</th><th>Contact</th><th>Request category</th><th>Message</th><th>Business profile</th></tr></thead><tbody>{rows.length ? rows.map(row => <tr key={row.id}><td>{new Date(row.submittedAt).toLocaleDateString()}<small>{new Date(row.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></td><td><b>{row.companyName}</b></td><td><a href={`mailto:${row.email}`}>{row.firstName} {row.lastName}</a><small>{row.email}</small></td><td><span className="type-chip support">{row.supportTopic ?? "Other"}</span></td><td className="message-cell">{row.message ?? "No message provided"}</td><td><ProfileLink id={row.id} /></td></tr>) : <EmptyRow columns={6} message="No support requests match the active date filters." />}</tbody></table></div>;
}

function EmptyRow({ columns, message }: { columns: number; message: string }) {
  return <tr><td colSpan={columns} className="empty-row">{message}</td></tr>;
}

function ProfileLink({ id }: { id: number }) {
  return <Link className="view-business-link" href={`/leads/${id}`}>View business data</Link>;
}
