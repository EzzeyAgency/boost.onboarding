"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import BrandHeader from "@/components/BrandHeader";
import { supportTopics as topicOptions } from "@/lib/validation";

const PREFILL = ["firstName", "lastName", "email", "companyName"] as const;

export default function SupportForm() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", companyName: "", topic: "", message: "", tried: "", companyWebsite: "" });
  const [fromOnboarding, setFromOnboarding] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const set = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value }));

  // Pre-fill details passed from the onboarding form so customers don't type them twice.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill: Record<string, string> = {};
    for (const key of PREFILL) { const value = params.get(key); if (value) prefill[key] = value.slice(0, 255); }
    const topic = params.get("topic");
    if (topic && (topicOptions as readonly string[]).includes(topic)) prefill.topic = topic;
    if (Object.keys(prefill).length) setForm(previous => ({ ...previous, ...prefill }));
    setFromOnboarding(params.get("from") === "onboarding");
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.email.trim() || !form.companyName.trim() || !form.topic || form.message.trim().length < 5) {
      setError("Please fill in every field marked with *.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, fromOnboarding }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof result.error === "string" ? result.error : "We couldn't send your request. Please try again.");
        return;
      }
      setSubmitted(true);
      window.scrollTo({ top: 0 });
    } catch {
      setError("We couldn't reach our server. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  return <main className="app-shell">
    <BrandHeader />
    <section className="support-layout">
      <div className="support-intro">
        <p className="eyebrow">BOOST SUPPORT</p>
        <h1>We're here to help.</h1>
        <p>Stuck on your Google Business Profile, the secure Google connection, or the onboarding form? Tell us what's going on and the right person on our team will follow up.</p>
        <div className="support-marker"><span>✓</span><p>Never share passwords. Just tell us what you're seeing.{fromOnboarding && " Your onboarding answers are saved, so you can go back to that tab anytime."}</p></div>
      </div>
      {submitted
        ? <div className="support-success"><div className="success-icon"><Check size={30} /></div><h2>We've got your request.</h2><p>Thank you{form.firstName ? `, ${form.firstName}` : ""}. Our team has received your message and will contact you at {form.email}.</p>{fromOnboarding && <p className="support-back">You can close this tab and go back to your onboarding.</p>}</div>
        : <form className="support-form" onSubmit={submit} noValidate>
          <label className="honeypot" aria-hidden="true">Company website<input tabIndex={-1} autoComplete="off" value={form.companyWebsite} onChange={e => set("companyWebsite", e.target.value)} /></label>
          <div className="form-canvas-header"><p className="eyebrow">SUPPORT REQUEST</p><span>Takes about 2 minutes</span></div>
          <div className="two-column">
            <label className="form-field"><span className="field-label">First name <b>*</b></span><input autoComplete="given-name" value={form.firstName} onChange={e => set("firstName", e.target.value)} /></label>
            <label className="form-field"><span className="field-label">Last name</span><input autoComplete="family-name" value={form.lastName} onChange={e => set("lastName", e.target.value)} /></label>
          </div>
          <div className="two-column">
            <label className="form-field"><span className="field-label">Email address <b>*</b></span><input type="email" autoComplete="email" value={form.email} onChange={e => set("email", e.target.value)} /></label>
            <label className="form-field"><span className="field-label">Phone number</span><span className="field-hint">Optional, if a quick call is easier.</span><input type="tel" autoComplete="tel" value={form.phone} onChange={e => set("phone", e.target.value)} /></label>
          </div>
          <label className="form-field"><span className="field-label">Business name <b>*</b></span><input autoComplete="organization" value={form.companyName} onChange={e => set("companyName", e.target.value)} /></label>
          <fieldset className="form-field"><legend className="field-label">What do you need help with? <b>*</b></legend><div className="radio-stack">{topicOptions.map(topic => <label className={form.topic === topic ? "choice-card selected" : "choice-card"} key={topic}><input type="radio" name="topic" checked={form.topic === topic} onChange={() => set("topic", topic)} /><span className="radio-dot" /><span>{topic}</span></label>)}</div></fieldset>
          <label className="form-field"><span className="field-label">What's going on? <b>*</b></span><span className="field-hint">What were you trying to do, and what happened? Include any error message you saw.</span><textarea rows={4} value={form.message} onChange={e => set("message", e.target.value)} /></label>
          <label className="form-field"><span className="field-label">What have you tried so far?</span><span className="field-hint">Optional, but it helps us skip steps you've already done.</span><textarea rows={2} value={form.tried} onChange={e => set("tried", e.target.value)} /></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button support-submit" disabled={pending}>{pending ? <><Loader2 className="spin" size={18} /> Sending</> : <>Send to our team <Send size={18} /></>}</button>
        </form>}
    </section>
  </main>;
}
