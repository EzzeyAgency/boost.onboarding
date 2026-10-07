"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import BrandHeader from "@/components/BrandHeader";
import { supportTopics as topicOptions } from "@/lib/validation";

export default function SupportForm() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", companyName: "", message: "", topic: "", companyWebsite: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const set = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.firstName || !form.email || !form.companyName || !form.message || !form.topic) {
      setError("Please complete every required field.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof result.error === "string" ? result.error : "We could not submit your request. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("We could not reach our server. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  return <main className="app-shell"><BrandHeader /><section className="support-layout"><div className="support-intro"><p className="eyebrow">BOOST SUPPORT</p><h1>Let us clear the next obstacle.</h1><p>If Google Business Profile setup, verification, account access, or the onboarding form is holding you up, send our team a short note. We will route it to the right person.</p><div className="support-marker"><span>01</span><p>No passwords needed. Share only the detail that helps us understand the issue.</p></div></div>{submitted ? <div className="support-success"><div className="success-icon"><Check size={30}/></div><h2>Your request is in the queue.</h2><p>Thank you. We recorded your support request and will route it to the appropriate team member.</p></div> : <form className="support-form" onSubmit={submit}><label className="honeypot" aria-hidden="true">Company website<input tabIndex={-1} autoComplete="off" value={form.companyWebsite} onChange={e => set("companyWebsite", e.target.value)} /></label><div className="form-canvas-header"><p className="eyebrow">SUPPORT REQUEST</p><span>We are here to help</span></div><div className="two-column"><label className="form-field"><span className="field-label">First name <b>*</b></span><input value={form.firstName} onChange={e => set("firstName", e.target.value)} /></label><label className="form-field"><span className="field-label">Last name</span><input value={form.lastName} onChange={e => set("lastName", e.target.value)} /></label></div><label className="form-field"><span className="field-label">Email address <b>*</b></span><input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></label><label className="form-field"><span className="field-label">Company name <b>*</b></span><input value={form.companyName} onChange={e => set("companyName", e.target.value)} /></label><fieldset className="form-field"><legend className="field-label">Which area best describes the issue? <b>*</b></legend><div className="radio-stack">{topicOptions.map(topic => <label className={form.topic === topic ? "choice-card selected" : "choice-card"} key={topic}><input type="radio" name="topic" checked={form.topic === topic} onChange={() => set("topic", topic)} /><span className="radio-dot"/><span>{topic}</span></label>)}</div></fieldset><label className="form-field"><span className="field-label">What do you need help with? <b>*</b></span><textarea rows={5} value={form.message} onChange={e => set("message", e.target.value)} placeholder="Tell us what is getting in the way and what you have already tried." /></label>{error && <div className="form-error">{error}</div>}<button className="primary-button support-submit" disabled={pending}>{pending ? <><Loader2 className="spin" size={18}/> Sending request</> : <>Submit support request <Send size={18}/></>}</button></form>}</section></main>;
}
