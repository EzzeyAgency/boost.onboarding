"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, CircleHelp, Copy, ExternalLink, LifeBuoy, Loader2, PlayCircle, Save, ShieldCheck, Sparkles } from "lucide-react";
import BrandHeader from "@/components/BrandHeader";
import { LINKS } from "@/lib/links";
import {
  ACCESS_HELP,
  ADDRESS_SERVICE_MODES,
  COMM_OTHER,
  COMM_TEXT,
  CONTACT_OTHER,
  RECOVERY_OTHER,
  REVIEW_STEP,
  SETUP_DONE,
  SETUP_HELP,
  accessOptions,
  authorityOptions,
  callTrackingOptions,
  communicationOptions,
  googleProfileLabel,
  googleProfileOptions,
  outcomesTrackingOptions,
  preferredContactOptions,
  recoveryHelpOptions,
  recoveryIssueOptions,
  serviceModeOptions,
  setupOptions,
  statusCheckOptions,
  steps,
  websiteStatusOptions,
} from "@/lib/form";
import { stepIssues } from "@/lib/validation";

type FormState = Record<string, string | boolean>;
type SetValue = (key: string, value: string | boolean) => void;
type StepProps = { form: FormState; setValue: SetValue; supportHref: string };

const STORAGE_KEY = "boost-onboarding-progress";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialState: FormState = {
  googleProfileState: "", googleAccessCompletion: "", googleAccessHelp: "",
  serviceMode: "", businessAddress: "", businessPhone: "", businessHours: "", googleAuthority: "",
  setupStatus: "", setupHelp: "",
  recoveryContactName: "", recoveryContactEmail: "", recoveryIssue: "", recoveryIssueOther: "", recoveryHelp: "", statusCheckHelp: "",
  firstName: "", lastName: "", email: "", companyName: "", businessRole: "",
  websiteStatus: "", website: "", businessDescription: "", growthFocus: "", growthAreas: "",
  preferredContact: "", preferredContactOther: "", holdingBack: "", differentiator: "", exclusions: "",
  success90: "", successYear: "", highValueWork: "", competitors: "", optionalKeywords: "",
  responseOwner: "", callTracking: "", outcomesTracking: "", formDestination: "", leadChallenges: "",
  reportRecipients: "", communicationPreference: "", communicationOther: "", mobileNumber: "", smsConsent: false, notes: "",
  companyWebsite: "",
};

const plain = (options: readonly string[]) => options.map(option => [option, option] as const);

function Field({ label, hint, required = false, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="form-field">
      <span className="field-label">{label} {required && <b aria-label="required">*</b>}</span>
      {hint && <span className="field-hint">{hint}</span>}
      {children}
    </label>
  );
}

function Choice({ label, hint, name, value, options, onChange }: { label: string; hint?: string; name: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) {
  return (
    <fieldset className="form-field">
      <legend className="field-label">{label} <b aria-label="required">*</b></legend>
      {hint && <span className="field-hint">{hint}</span>}
      <div className="radio-stack">
        {options.map(([optionValue, optionLabel]) => (
          <label className={value === optionValue ? "choice-card selected" : "choice-card"} key={optionValue}>
            <input type="radio" name={name} value={optionValue} checked={value === optionValue} onChange={() => onChange(optionValue)} />
            <span className="radio-dot" aria-hidden="true" />
            <span>{optionLabel}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Text({ value, onChange, placeholder, type = "text", autoComplete }: { value: unknown; onChange: (value: string) => void; placeholder?: string; type?: string; autoComplete?: string }) {
  return <input type={type} value={String(value ?? "")} placeholder={placeholder} autoComplete={autoComplete} onChange={event => onChange(event.target.value)} />;
}

function Area({ value, onChange, placeholder, rows = 3 }: { value: unknown; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  return <textarea value={String(value ?? "")} placeholder={placeholder} rows={rows} onChange={event => onChange(event.target.value)} />;
}

function HelpLink({ href, children = "Get help from our team" }: { href: string; children?: React.ReactNode }) {
  return <div className="support-hint"><LifeBuoy size={18} /><span>Stuck? <a href={href} target="_blank" rel="noreferrer">{children}</a>. Your answers here are saved.</span></div>;
}

export default function OnboardingForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState<{ ready: boolean } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "offline">("idle");
  const [restored, setRestored] = useState<"" | "device" | "link" | "link-missing">("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef<HTMLElement>(null);

  const setValue: SetValue = useCallback((key, value) => setForm(previous => ({ ...previous, [key]: value })), []);
  const emailOk = EMAIL_PATTERN.test(String(form.email).trim());

  // Restore saved progress: a resume link wins over this device's copy.
  useEffect(() => {
    const resume = new URLSearchParams(window.location.search).get("resume");
    const fromDevice = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
        if (saved?.form && Object.values(saved.form).some(value => value)) {
          setForm({ ...initialState, ...saved.form });
          setStep(Math.min(Number(saved.step) || 0, REVIEW_STEP));
          if (saved.token) setToken(saved.token);
          setRestored("device");
        }
      } catch { /* storage unavailable */ }
    };
    if (resume) {
      fetch(`/api/drafts?token=${encodeURIComponent(resume)}`, { cache: "no-store" })
        .then(async response => {
          if (!response.ok) throw new Error("not found");
          const draft = await response.json();
          setForm({ ...initialState, ...draft.data, email: draft.data.email || draft.email });
          setStep(Math.min(Number(draft.step) || 0, REVIEW_STEP));
          setToken(resume);
          setRestored("link");
        })
        .catch(() => { fromDevice(); setRestored(previous => previous || "link-missing"); })
        .finally(() => { window.history.replaceState(null, "", "/"); setLoaded(true); });
    } else {
      fromDevice();
      setLoaded(true);
    }
  }, []);

  // Keep a copy on this device at all times.
  useEffect(() => {
    if (!loaded || complete) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, step, token })); } catch { /* storage unavailable */ }
  }, [form, step, token, complete, loaded]);

  const saveDraft = useCallback(async (notify = false) => {
    const email = String(form.email).trim();
    if (!EMAIL_PATTERN.test(email)) return null;
    setSaveState("saving");
    try {
      const { companyWebsite: _honeypot, ...data } = form;
      const response = await fetch("/api/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: token ?? undefined, email, step, data, notify }) });
      const result = await response.json().catch(() => ({}));
      if (response.status === 409) { setToken(null); throw new Error("already submitted"); }
      if (!response.ok) throw new Error("save failed");
      setToken(result.token);
      setSaveState("saved");
      return result.resumeUrl as string;
    } catch {
      setSaveState("offline");
      return null;
    }
  }, [form, step, token]);

  // Autosave to the server once we know the customer's email, so progress is never lost and the team can follow up.
  useEffect(() => {
    if (!loaded || complete || !emailOk) return;
    const timer = setTimeout(() => { void saveDraft(false); }, 2500);
    return () => clearTimeout(timer);
    // saveDraft changes with form/step/token; only re-run when the answers or step change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, step, emailOk, complete, loaded]);

  const supportHref = useMemo(() => {
    const params = new URLSearchParams({ from: "onboarding" });
    for (const key of ["firstName", "lastName", "email", "companyName"]) if (String(form[key] ?? "").trim()) params.set(key, String(form[key]));
    const topics: Record<string, string> = {
      verified_no_access: "Getting into my Google Business Profile",
      unverified: "Google Business Profile verification",
      no_profile: "Google Business Profile setup",
      verified_accessible: "Secure Google connection (Leadsie)",
    };
    const topic = topics[String(form.googleProfileState)];
    if (topic) params.set("topic", topic);
    return `/support?${params}`;
  }, [form]);

  const goTo = (next: number) => {
    setError("");
    setStep(next);
    requestAnimationFrame(() => canvasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const next = () => {
    const issues = stepIssues(form, step);
    if (issues.length) { setError(issues[0].message); return; }
    goTo(Math.min(step + 1, REVIEW_STEP));
  };

  const submit = async () => {
    for (let index = 0; index < REVIEW_STEP; index++) {
      const issues = stepIssues(form, index);
      if (issues.length) { goTo(index); setError(issues[0].message); return; }
    }
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, smsConsent: Boolean(form.smsConsent), draftToken: token ?? undefined }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (typeof result.step === "number") setStep(result.step);
        setError(typeof result.error === "string" ? result.error : "We couldn't save your answers yet. Please review the steps and try again.");
        return;
      }
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
      setComplete({ ready: result.googleAccessStatus === "confirmed" });
      window.scrollTo({ top: 0 });
    } catch {
      setError("We couldn't reach our server. Please check your connection and try again. Your answers are saved on this device.");
    } finally {
      setPending(false);
    }
  };

  const startOver = () => {
    if (!window.confirm("Clear all your answers and start over?")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
    setForm(initialState); setToken(null); setStep(0); setRestored(""); setSaveState("idle"); setError("");
  };

  if (complete) {
    return (
      <main className="app-shell">
        <BrandHeader />
        <section className="success-page">
          <div className="success-icon"><Check size={34} /></div>
          <p className="eyebrow">ONBOARDING COMPLETE</p>
          <h1>Thank you. You're all set.</h1>
          <p>
            {complete.ready
              ? "We have your answers and your secure Google connection. Your BOOST team is already working and will use this to tailor your service and reports."
              : "We have your answers, and your BOOST team is already working. If you still have a Google step to finish, please complete it as soon as you can. We'll reach out if you need help."}
          </p>
          <a href={supportHref} className="secondary-button">Need help? Contact our team</a>
        </section>
      </main>
    );
  }

  const current = steps[step];
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const props: StepProps = { form, setValue, supportHref };

  return (
    <main className="app-shell">
      <BrandHeader />
      <section className="onboarding-layout">
        <aside className="progress-rail">
          <p className="eyebrow">BOOST ONBOARDING · ABOUT 10 MINUTES</p>
          <h1>The most important 10 minutes <span>you'll invest in your business this year.</span></h1>
          <div className="rail-copy">
            <p>Your BOOST team started working as soon as your payment went through. Your answers and a secure Google connection help us give you better service, clearer reports, and better results.</p>
            <p>We've helped more than 1,000 local businesses get found and contacted, so we know where to look. You know your business best. Together we'll focus on what matters to you.</p>
          </div>
          <div className="mobile-progress" aria-hidden="true">
            <span>Part {current.part} of 2 · Step {step + 1} of {steps.length}</span>
            <div className="mobile-progress-bar"><i style={{ width: `${progress}%` }} /></div>
          </div>
          {[1, 2].map(part => (
            <div className="step-group" key={part}>
              <p className="step-group-label">{part === 1 ? "Part 1: Get started in 1, 2, 3" : "Part 2: Get to know your business"}</p>
              <ol className="step-list">
                {steps.map((item, index) => item.part === part && (
                  <li key={item.id} className={index === step ? "active" : index < step ? "done" : ""}>
                    <span>{index < step ? <Check size={14} /> : index + 1}</span>
                    <b>{item.label}</b>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <div className="rail-note"><ShieldCheck size={18} /><span>We never ask for passwords. You can save and finish later at any time.</span></div>
          <a className="rail-help" href={supportHref} target="_blank" rel="noreferrer"><LifeBuoy size={18} /> Need help? Contact our team</a>
        </aside>

        <section className="form-canvas" ref={canvasRef}>
          {restored === "device" && <div className="restore-banner"><Check size={18} /><span>Welcome back. We restored your progress on this device.</span><button type="button" onClick={startOver}>Start over</button></div>}
          {restored === "link" && <div className="restore-banner"><Check size={18} /><span>Welcome back. Your saved answers are loaded.</span></div>}
          {restored === "link-missing" && <div className="restore-banner warn"><CircleHelp size={18} /><span>We couldn't find saved answers for that link. It may have already been submitted.</span></div>}

          <div className="form-canvas-header">
            <p className="eyebrow">{current.part === 1 ? "PART 1 · GET STARTED" : "PART 2 · YOUR BUSINESS"}</p>
            <span>Step {step + 1} of {steps.length}</span>
          </div>

          <label className="honeypot" aria-hidden="true">Company website<input tabIndex={-1} autoComplete="off" value={String(form.companyWebsite)} onChange={event => setValue("companyWebsite", event.target.value)} /></label>

          {step === 0 && <GoogleStep {...props} />}
          {step === 1 && <ConnectStep {...props} />}
          {step === 2 && <ContactStep {...props} />}
          {step === 3 && <BusinessStep {...props} />}
          {step === 4 && <GoalsStep {...props} />}
          {step === 5 && <LeadsStep {...props} />}
          {step === 6 && <UpdatesStep {...props} />}
          {step === 7 && <ReviewStep form={form} />}

          {error && <div className="form-error" role="alert"><CircleHelp size={18} />{error}</div>}

          <footer className="form-actions">
            {step > 0 ? <button type="button" className="back-button" onClick={() => goTo(step - 1)}><ChevronLeft size={18} /> Back</button> : <span />}
            {step < REVIEW_STEP
              ? <button type="button" className="primary-button" onClick={next}>Continue <ChevronRight size={18} /></button>
              : <button type="button" className="primary-button" disabled={pending} onClick={submit}>{pending ? <><Loader2 className="spin" size={18} /> Submitting</> : <>Submit onboarding <Sparkles size={18} /></>}</button>}
          </footer>

          <SaveBar form={form} setValue={setValue} emailOk={emailOk} saveState={saveState} open={saveOpen} setOpen={setSaveOpen} save={saveDraft} />
        </section>
      </section>
    </main>
  );
}

function SaveBar({ form, setValue, emailOk, saveState, open, setOpen, save }: { form: FormState; setValue: SetValue; emailOk: boolean; saveState: string; open: boolean; setOpen: (open: boolean) => void; save: (notify?: boolean) => Promise<string | null> }) {
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const saveNow = async () => {
    if (!emailOk) { setMessage("Please enter a valid email address."); return; }
    setBusy(true); setMessage("");
    const url = await save(true);
    setBusy(false);
    if (url) setLink(url); else setMessage("We couldn't save to our server right now. Your answers are still saved on this device. Please try again in a moment.");
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
  };

  return (
    <div className="save-bar">
      <div className="save-status" aria-live="polite">
        {saveState === "saving" && <><Loader2 className="spin" size={14} /> Saving…</>}
        {saveState === "saved" && <><Check size={14} /> Progress saved</>}
        {saveState === "offline" && <><CircleHelp size={14} /> Saved on this device</>}
        {saveState === "idle" && <>Your answers are saved on this device as you go.</>}
      </div>
      {!open && <button type="button" className="save-later-button" onClick={() => { setOpen(true); setLink(""); setMessage(""); }}><Save size={16} /> Save and finish later</button>}
      {open && (
        <div className="save-panel">
          {link ? (
            <>
              <p><b>Your progress is saved.</b> Use this link to pick up where you left off, on any device:</p>
              <div className="resume-link"><input readOnly value={link} onFocus={event => event.currentTarget.select()} aria-label="Your resume link" /><button type="button" className="secondary-button" onClick={copy}><Copy size={16} /> {copied ? "Copied" : "Copy link"}</button></div>
              <p className="field-hint">Keep this link private. Anyone with it can see and change your answers.</p>
              <button type="button" className="back-button" onClick={() => setOpen(false)}>Keep going now</button>
            </>
          ) : (
            <>
              <p><b>Save your progress and come back anytime.</b> We'll create a private link so you can finish later.</p>
              {!emailOk && <Field label="Your email address" required><Text type="email" autoComplete="email" value={form.email} onChange={value => setValue("email", value)} /></Field>}
              {message && <div className="form-error" role="alert"><CircleHelp size={18} />{message}</div>}
              <div className="inline-actions">
                <button type="button" className="primary-button" disabled={busy} onClick={saveNow}>{busy ? <><Loader2 className="spin" size={16} /> Saving</> : <>Save my progress</>}</button>
                <button type="button" className="back-button" onClick={() => setOpen(false)}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StepIntro({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="step-intro"><h2>{title}</h2><p>{children}</p></div>;
}

function GoogleStep({ form, setValue }: StepProps) {
  return <div className="step-content">
    <StepIntro title="Let's start with your Google Business Profile.">Your Google Business Profile is what customers see when they search for you on Google and Google Maps. It's one of the biggest reasons people call one business instead of another.</StepIntro>
    <Choice label="Which statement best describes your Google Business Profile today?" name="googleProfileState" value={String(form.googleProfileState)} onChange={value => setValue("googleProfileState", value)} options={googleProfileOptions} />
  </div>;
}

function ConnectStep(props: StepProps) {
  const state = String(props.form.googleProfileState);
  if (state === "verified_accessible") return <div className="step-content"><StepIntro title="Connect Google securely.">This takes about 2 minutes. It lets us see what customers see, fix problems faster, and show you clear results in your reports.</StepIntro><AccessPanel {...props} /></div>;
  if (state === "unverified" || state === "no_profile") return <SetupPath {...props} />;
  if (state === "verified_no_access") return <RecoveryPath {...props} />;
  return <UnsurePath {...props} />;
}

function AccessPanel({ form, setValue, supportHref }: StepProps) {
  return <div className="conditional-panel positive">
    <ol className="how-list">
      <li>Tap <b>Connect Google securely</b>. It opens in a new tab.</li>
      <li>Sign in with the Google account that manages your Business Profile.</li>
      <li>Approve access for Ezzey, then come back to this tab.</li>
    </ol>
    <div className="inline-actions">
      <a className="access-button" href={LINKS.leadsie} target="_blank" rel="noreferrer">Connect Google securely <ExternalLink size={16} /></a>
      <a className="text-link" href={LINKS.googleBusiness} target="_blank" rel="noreferrer">Not sure which Google account manages it? Check here <ExternalLink size={14} /></a>
    </div>
    <p className="field-hint">The connection is handled by Leadsie, a secure service agencies use to request access. You never share your password.</p>
    <Choice label="Did you finish connecting Google?" name="googleAccessCompletion" value={String(form.googleAccessCompletion)} onChange={value => setValue("googleAccessCompletion", value)} options={plain(accessOptions)} />
    {form.googleAccessCompletion === ACCESS_HELP && <Field label="What got in the way?" hint="For example: I don't know which account to use, or I got an error." required><Area value={form.googleAccessHelp} onChange={value => setValue("googleAccessHelp", value)} /></Field>}
    <HelpLink href={supportHref} />
  </div>;
}

function SetupPath(props: StepProps) {
  const { form, setValue, supportHref } = props;
  const noProfile = form.googleProfileState === "no_profile";
  const needsAddress = ADDRESS_SERVICE_MODES.includes(String(form.serviceMode));
  return <div className="step-content">
    <StepIntro title={noProfile ? "Let's get your Google Business Profile created." : "Let's get your Google Business Profile verified."}>{noProfile ? "Google needs a profile before customers can find you on Google Maps. This short video shows you how to create one." : "Google only shows verified profiles to customers. This short video shows you how to finish verification."}</StepIntro>
    <div className="conditional-panel">
      <div className="video-frame video-link-frame"><a href={LINKS.setupVideo} target="_blank" rel="noreferrer"><PlayCircle size={34} /><span><b>Watch: how to {noProfile ? "create" : "verify"} your Google Business Profile</b><small>Opens the video on YouTube in a new tab</small></span><ExternalLink size={18} /></a></div>
      {noProfile && <>
        <p className="panel-note">A few details Google will ask for, so we can help you set it up correctly:</p>
        <Choice label="How do you serve customers?" name="serviceMode" value={String(form.serviceMode)} onChange={value => setValue("serviceMode", value)} options={plain(serviceModeOptions)} />
        {needsAddress && <Field label="Business address" hint="Google needs this to verify you. If customers don't visit you, Google can keep it hidden." required><Area rows={2} value={form.businessAddress} onChange={value => setValue("businessAddress", value)} /></Field>}
        <div className="two-column">
          <Field label="Phone number customers should call" required><Text type="tel" autoComplete="tel" value={form.businessPhone} onChange={value => setValue("businessPhone", value)} /></Field>
          <Field label="Business hours" required><Text value={form.businessHours} placeholder="Mon to Fri, 8 AM to 5 PM" onChange={value => setValue("businessHours", value)} /></Field>
        </div>
        <Choice label="Are you allowed to create and manage the profile for your business?" name="googleAuthority" value={String(form.googleAuthority)} onChange={value => setValue("googleAuthority", value)} options={plain(authorityOptions)} />
      </>}
      <Choice label="After watching the video, where are you now?" name="setupStatus" value={String(form.setupStatus)} onChange={value => setValue("setupStatus", value)} options={plain(setupOptions)} />
      {form.setupStatus === SETUP_HELP && <Field label="What do you need help with?" required><Area value={form.setupHelp} onChange={value => setValue("setupHelp", value)} /></Field>}
      {form.setupStatus === SETUP_DONE && <div className="setup-complete-callout"><b>Great. Now connect Google securely so we can start using it.</b><AccessPanel {...props} /></div>}
      {form.setupStatus !== SETUP_DONE && <HelpLink href={supportHref} />}
    </div>
  </div>;
}

function RecoveryPath({ form, setValue, supportHref }: StepProps) {
  return <div className="step-content">
    <StepIntro title="Let's get you back into your profile.">This happens a lot, often after a past employee or agency set it up. Tell us what you know and we'll help you get access back.</StepIntro>
    <div className="conditional-panel">
      <div className="two-column">
        <Field label="Who might have access?" hint="Optional. A name or company, if you know it."><Text value={form.recoveryContactName} placeholder="Name or company" onChange={value => setValue("recoveryContactName", value)} /></Field>
        <Field label="Their email address" hint="Optional, if you know it."><Text type="email" value={form.recoveryContactEmail} onChange={value => setValue("recoveryContactEmail", value)} /></Field>
      </div>
      <Choice label="What best describes the problem?" name="recoveryIssue" value={String(form.recoveryIssue)} onChange={value => setValue("recoveryIssue", value)} options={plain(recoveryIssueOptions)} />
      {form.recoveryIssue === RECOVERY_OTHER && <Field label="Please describe the problem" required><Area value={form.recoveryIssueOther} onChange={value => setValue("recoveryIssueOther", value)} /></Field>}
      <Choice label="Would you like our help getting access back?" name="recoveryHelp" value={String(form.recoveryHelp)} onChange={value => setValue("recoveryHelp", value)} options={plain(recoveryHelpOptions)} />
      <HelpLink href={supportHref} />
    </div>
  </div>;
}

function UnsurePath({ form, setValue, supportHref }: StepProps) {
  return <div className="step-content">
    <StepIntro title="No problem. We can check for you.">Many owners aren't sure whether a profile exists or who set it up. Keep going with the form and we'll help you find out.</StepIntro>
    <div className="conditional-panel">
      <a className="text-link" href={LINKS.googleBusiness} target="_blank" rel="noreferrer">Want to check yourself? Open Google Business Profile <ExternalLink size={14} /></a>
      <Choice label="Would you like our help checking?" name="statusCheckHelp" value={String(form.statusCheckHelp)} onChange={value => setValue("statusCheckHelp", value)} options={plain(statusCheckOptions)} />
      <HelpLink href={supportHref} />
    </div>
  </div>;
}

function ContactStep({ form, setValue }: StepProps) {
  return <div className="step-content">
    <StepIntro title="Your details.">So we know who to talk to. We'll also use your email to save your progress.</StepIntro>
    <div className="two-column">
      <Field label="First name" required><Text autoComplete="given-name" value={form.firstName} onChange={value => setValue("firstName", value)} /></Field>
      <Field label="Last name" required><Text autoComplete="family-name" value={form.lastName} onChange={value => setValue("lastName", value)} /></Field>
    </div>
    <Field label="Email address" required><Text type="email" autoComplete="email" value={form.email} onChange={value => setValue("email", value)} /></Field>
    <div className="two-column">
      <Field label="Business name" required><Text autoComplete="organization" value={form.companyName} onChange={value => setValue("companyName", value)} /></Field>
      <Field label="Your role" required><Text value={form.businessRole} placeholder="Owner, manager, office lead..." onChange={value => setValue("businessRole", value)} /></Field>
    </div>
    <div className="part-break"><Sparkles size={18} /><span><b>Part 1 is almost done.</b> Next, a few questions so we can get to know your business and focus on what matters to you.</span></div>
  </div>;
}

function BusinessStep({ form, setValue }: StepProps) {
  return <div className="step-content">
    <StepIntro title="Tell us about your business.">This helps us understand your business, spot where attention may be needed, and focus on the improvements that matter most to you.</StepIntro>
    <Choice label="Does your business have a website?" name="websiteStatus" value={String(form.websiteStatus)} onChange={value => setValue("websiteStatus", value)} options={websiteStatusOptions} />
    {form.websiteStatus === "yes" && <Field label="Website address" required><Text type="url" value={form.website} placeholder="yourbusiness.com" onChange={value => setValue("website", value)} /></Field>}
    <Field label="What does your business do?" hint="In your own words. What do you sell or what services do you offer?" required><Area value={form.businessDescription} onChange={value => setValue("businessDescription", value)} /></Field>
    <Field label="What do you want more of?" hint="The services, products, jobs, or types of customers you most want to grow." required><Area value={form.growthFocus} onChange={value => setValue("growthFocus", value)} /></Field>
    <Field label="Where do you want more customers from?" hint="Cities, neighborhoods, ZIP codes, or regions." required><Area rows={2} value={form.growthAreas} onChange={value => setValue("growthAreas", value)} /></Field>
    <Choice label="How would you prefer new customers to reach out to you?" name="preferredContact" value={String(form.preferredContact)} onChange={value => setValue("preferredContact", value)} options={plain(preferredContactOptions)} />
    {form.preferredContact === CONTACT_OTHER && <Field label="How would you like them to reach you?" required><Text value={form.preferredContactOther} onChange={value => setValue("preferredContactOther", value)} /></Field>}
    <Field label="What do you feel is holding your business back?" hint="For example: not enough reviews, a website that makes it hard to call or request a quote, a Google profile with missing or wrong details, or your name, address, or phone number listed differently online." required><Area rows={4} value={form.holdingBack} onChange={value => setValue("holdingBack", value)} /></Field>
    <Field label="What makes your business different?" hint="Why do customers choose you over others?" required><Area value={form.differentiator} onChange={value => setValue("differentiator", value)} /></Field>
    <Field label="Is there anything you don't want more of?" hint="Services, jobs, customers, or areas to avoid. Write &quot;None&quot; if nothing comes to mind." required><Area rows={2} value={form.exclusions} onChange={value => setValue("exclusions", value)} /></Field>
  </div>;
}

function GoalsStep({ form, setValue }: StepProps) {
  return <div className="step-content">
    <StepIntro title="What does success look like?">Your goals tell us what to focus on and what to show you in your reports.</StepIntro>
    <Field label="What would a great first 90 days look like?" required><Area value={form.success90} onChange={value => setValue("success90", value)} /></Field>
    <Field label="What would a great first year look like?" required><Area value={form.successYear} onChange={value => setValue("successYear", value)} /></Field>
    <Field label="Which customers or jobs are most valuable to you?" required><Area value={form.highValueWork} onChange={value => setValue("highValueWork", value)} /></Field>
    <Field label="Who are your main competitors?" hint="Names, websites, or locations. Write &quot;Not sure&quot; if you don't know." required><Area rows={2} value={form.competitors} onChange={value => setValue("competitors", value)} /></Field>
    <Field label="What words do customers use when they look for a business like yours?" hint="We do the research, but your view helps. Write &quot;Not sure&quot; if nothing comes to mind." required><Area rows={2} value={form.optionalKeywords} onChange={value => setValue("optionalKeywords", value)} /></Field>
  </div>;
}

function LeadsStep({ form, setValue }: StepProps) {
  return <div className="step-content">
    <StepIntro title="How new customers reach you today.">This helps us see where calls and messages go, so more of them turn into customers.</StepIntro>
    <Field label="Who answers new calls and messages?" required><Area rows={2} value={form.responseOwner} placeholder="For example: I do, or our office manager" onChange={value => setValue("responseOwner", value)} /></Field>
    <Choice label="Do you use a call-tracking phone number?" hint="A special number that counts calls from ads or your website." name="callTracking" value={String(form.callTracking)} onChange={value => setValue("callTracking", value)} options={plain(callTrackingOptions)} />
    <Choice label="How do you keep track of which calls and messages become customers?" name="outcomesTracking" value={String(form.outcomesTracking)} onChange={value => setValue("outcomesTracking", value)} options={plain(outcomesTrackingOptions)} />
    <Field label="Where do messages from your website go?" hint="For example: an email inbox, a booking app, or a person. Write &quot;Not sure&quot; if you don't know." required><Area rows={2} value={form.formDestination} onChange={value => setValue("formDestination", value)} /></Field>
    <Field label="Any problems with missed calls, slow replies, or follow-up?" hint="Write &quot;None&quot; if everything works well." required><Area rows={3} value={form.leadChallenges} onChange={value => setValue("leadChallenges", value)} /></Field>
  </div>;
}

function UpdatesStep({ form, setValue }: StepProps) {
  return <div className="step-content">
    <StepIntro title="Keep the right people in the loop.">Tell us who should get your BOOST updates and reports.</StepIntro>
    <Field label="Who should receive BOOST updates?" hint="Name, email, and role for each person." required><Area rows={3} value={form.reportRecipients} placeholder="Jane Smith, jane@company.com, Owner" onChange={value => setValue("reportRecipients", value)} /></Field>
    <Choice label="How would you like to get important updates?" name="communicationPreference" value={String(form.communicationPreference)} onChange={value => setValue("communicationPreference", value)} options={plain(communicationOptions)} />
    {form.communicationPreference === COMM_OTHER && <Field label="How would you like to get updates?" required><Text value={form.communicationOther} onChange={value => setValue("communicationOther", value)} /></Field>}
    {form.communicationPreference === COMM_TEXT && <div className="conditional-panel">
      <Field label="Mobile number for text updates" required><Text type="tel" autoComplete="tel" value={form.mobileNumber} onChange={value => setValue("mobileNumber", value)} /></Field>
      <label className="check-line"><input type="checkbox" checked={Boolean(form.smsConsent)} onChange={event => setValue("smsConsent", event.target.checked)} /><span>I agree to receive BOOST updates by text message at this number.</span></label>
    </div>}
    <Field label="Anything else we should know?" hint="Optional."><Area value={form.notes} onChange={value => setValue("notes", value)} /></Field>
  </div>;
}

function ReviewStep({ form }: { form: FormState }) {
  const setupDone = ["unverified", "no_profile"].includes(String(form.googleProfileState)) && form.setupStatus === SETUP_DONE;
  const connected = (form.googleProfileState === "verified_accessible" || setupDone) && form.googleAccessCompletion === accessOptions[0];
  const contact = form.preferredContact === CONTACT_OTHER ? form.preferredContactOther : form.preferredContact;
  return <div className="step-content">
    <StepIntro title="Review and submit.">Here's a quick summary. Use Back if you'd like to change anything.</StepIntro>
    <div className="review-card">
      <div><span>Business</span><b>{String(form.companyName || "Not provided")}</b><p>{String(form.businessDescription || "")}</p></div>
      <div><span>Google Business Profile</span><b className="no-cap">{googleProfileLabel(form.googleProfileState) || "Not provided"}</b><p>{connected ? "Connected securely. Thank you." : "We'll follow up on the next Google step with you."}</p></div>
      <div><span>Want more of</span><b className="no-cap">{String(form.growthFocus || "Not provided")}</b><p>{String(form.growthAreas || "")}</p></div>
      <div><span>How customers should reach you</span><b className="no-cap">{String(contact || "Not provided")}</b><p>{String(form.success90 || "")}</p></div>
    </div>
    <div className={connected ? "ready-banner ready" : "ready-banner"}>
      {connected
        ? <><ShieldCheck size={20} /><span>Google is connected. Your team can use it right away.</span></>
        : <><CircleHelp size={20} /><span>Google isn't connected yet. That's okay: submit now, and please finish the Google step as soon as you can. Your service has already started either way.</span></>}
    </div>
  </div>;
}
