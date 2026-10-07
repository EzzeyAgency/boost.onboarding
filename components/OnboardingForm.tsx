"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, CircleHelp, ExternalLink, Loader2, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";
import BrandHeader from "@/components/BrandHeader";
import { LINKS } from "@/lib/links";

type FormState = Record<string, string | boolean>;

const steps = [
  { id: "business", label: "Business" },
  { id: "google", label: "Google access" },
  { id: "goals", label: "Growth goals" },
  { id: "leadflow", label: "Lead flow" },
  { id: "reporting", label: "Reporting" },
  { id: "review", label: "Review" },
];

const primaryOutcomes = [
  "More qualified calls",
  "More quote or contact requests",
  "More appointments or bookings",
  "More website visitors",
  "Stronger visibility and reputation",
  "More accurate business information online",
  "Other",
];

const googleProfileOptions = [
  ["verified_accessible", "I have a verified Google Business Profile and can access it"],
  ["verified_no_access", "I have a verified Google Business Profile, but I cannot access it"],
  ["unverified", "I have a Google Business Profile, but it is not verified"],
  ["no_profile", "I do not have a Google Business Profile"],
  ["not_sure", "I am not sure"],
] as const;

const initialState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  companyName: "",
  businessRole: "",
  websiteMode: "url",
  website: "",
  businessDescription: "",
  growthFocus: "",
  growthAreas: "",
  primaryOutcome: "",
  differentiator: "",
  exclusions: "",
  googleProfileState: "",
  googleAccessCompletion: "",
  googleAccessBlocker: "",
  serviceMode: "",
  businessAddress: "",
  businessPhone: "",
  businessHours: "",
  googleAuthority: "",
  setupStatus: "",
  setupHelp: "",
  recoveryContactName: "",
  recoveryContactEmail: "",
  recoveryIssue: "",
  recoveryHelp: "",
  statusCheckHelp: "",
  success90: "",
  successYear: "",
  highValueWork: "",
  competitors: "",
  optionalKeywords: "",
  primaryConversion: "",
  responseOwner: "",
  callTracking: "",
  outcomesTracking: "",
  formDestination: "",
  leadChallenges: "",
  reportRecipients: "",
  communicationPreference: "",
  mobileNumber: "",
  smsConsent: false,
  notes: "",
  companyWebsite: "",
};

function Field({ label, hint, required = false, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="form-field">
      <span className="field-label">{label} {required && <b aria-label="required">*</b>}</span>
      {hint && <span className="field-hint">{hint}</span>}
      {children}
    </label>
  );
}

function RadioOptions({ name, value, options, onChange }: { name: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) {
  return (
    <div className="radio-stack" role="radiogroup" aria-label={name}>
      {options.map(([optionValue, label]) => (
        <label className={value === optionValue ? "choice-card selected" : "choice-card"} key={optionValue}>
          <input type="radio" name={name} value={optionValue} checked={value === optionValue} onChange={() => onChange(optionValue)} />
          <span className="radio-dot" aria-hidden="true" />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />;
}

function TextArea({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <textarea value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} rows={4} />;
}

export default function OnboardingForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState<{ ready: boolean; status: string } | null>(null);
  const [pending, setPending] = useState(false);

  const setValue = (key: string, value: string | boolean) => setForm(previous => ({ ...previous, [key]: value }));
  const googleState = String(form.googleProfileState);
  const isSetupPath = googleState === "unverified" || googleState === "no_profile";
  const isVerifiedPath = googleState === "verified_accessible";
  const isRecoveryPath = googleState === "verified_no_access";
  const isUnsurePath = googleState === "not_sure";

  const currentTitle = useMemo(() => steps[step]?.label ?? "", [step]);

  const validateStep = (stepToValidate: number) => {
    const required: Record<number, string[]> = {
      0: ["firstName", "lastName", "email", "companyName", "businessDescription", "growthFocus", "growthAreas", "primaryOutcome"],
      2: ["success90", "highValueWork"],
      3: ["primaryConversion", "responseOwner", "callTracking", "outcomesTracking"],
      4: ["reportRecipients", "communicationPreference"],
    };
    if (stepToValidate === 4 && String(form.reportRecipients).trim().length < 3) return "Please add the name, email address, or role of at least one reporting recipient before continuing.";
    const missing = (required[stepToValidate] ?? []).find(key => !String(form[key] ?? "").trim());
    if (missing) return "Please complete all required fields before continuing.";
    if (stepToValidate === 0 && form.websiteMode === "url" && !String(form.website).trim()) return "Please enter your website address or choose another website status.";
    if (stepToValidate === 1) {
      if (!googleState) return "Please choose the statement that best describes your Google Business Profile.";
      if (isVerifiedPath && !form.googleAccessCompletion) return "Please tell us the status of the secure access step.";
      if (isVerifiedPath && ["I need help", "I could not complete it"].includes(String(form.googleAccessCompletion)) && !String(form.googleAccessBlocker).trim()) return "Please describe what prevented the access step.";
      if (isSetupPath) {
        const noProfile = googleState === "no_profile";
        const setupFields = noProfile ? ["serviceMode", "businessPhone", "businessHours", "googleAuthority", "setupStatus"] : ["setupStatus"];
        if (setupFields.some(key => !String(form[key] ?? "").trim())) return "Please complete the setup and verification details shown for this path.";
        if (noProfile && ["Customers come to my physical business location", "My business travels to customers", "Both"].includes(String(form.serviceMode)) && !String(form.businessAddress).trim()) return "Please provide the physical address needed for setup and verification.";
        if (form.setupStatus === "I need help" && !String(form.setupHelp).trim()) return "Please tell us what support you need.";
        if (form.setupStatus === "I have completed setup and verification" && !form.googleAccessCompletion) return "Please tell us the status of the secure access step.";
        if (form.setupStatus === "I have completed setup and verification" && ["I need help", "I could not complete it"].includes(String(form.googleAccessCompletion)) && !String(form.googleAccessBlocker).trim()) return "Please describe what prevented the access step.";
      }
      if (isRecoveryPath && (!form.recoveryIssue || !form.recoveryHelp)) return "Please complete the profile-access recovery details.";
      if (isUnsurePath && !form.statusCheckHelp) return "Please choose how you would like to handle the profile-status check.";
    }
    if (stepToValidate === 4 && form.communicationPreference === "Text message" && (!String(form.mobileNumber).trim() || !form.smsConsent)) return "Please provide a mobile number and consent for text updates, or choose another update method.";
    return "";
  };

  const next = () => {
    const validation = validateStep(step);
    setError(validation);
    if (!validation) setStep(previous => Math.min(previous + 1, steps.length - 1));
  };

  const submit = async () => {
    const firstInvalid = [0, 1, 2, 3, 4]
      .map(index => ({ index, message: validateStep(index) }))
      .find(result => Boolean(result.message));
    if (firstInvalid) {
      setStep(firstInvalid.index);
      setError(firstInvalid.message);
      return;
    }
    setError("");
    const website = form.websiteMode === "url" ? String(form.website) : form.websiteMode === "none" ? "No website currently" : "Website address not known";
    const { websiteMode: _websiteMode, ...answers } = form;
    setPending(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...answers, website, smsConsent: Boolean(form.smsConsent) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (typeof result.step === "number") setStep(result.step);
        setError(typeof result.error === "string" ? result.error : "We could not save your onboarding yet. Please review the required fields and try again.");
        return;
      }
      setComplete({ ready: result.googleAccessStatus === "confirmed", status: result.googleAccessStatus });
    } catch {
      setError("We could not reach our server. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  if (complete) {
    return (
      <main className="app-shell">
        <BrandHeader />
        <section className="success-page">
          <div className="success-icon"><Check size={34} /></div>
          <p className="eyebrow">BOOST ONBOARDING</p>
          <h1>{complete.ready ? "Your access step is complete." : "Your onboarding has been received."}</h1>
          <p>{complete.ready ? "Thank you. We have recorded your Google Business Profile access step and the Ezzey team can begin the internal fulfillment review." : "Thank you. We have recorded your information and the appropriate next step. If your Google access is pending, please complete it as soon as possible so work can begin."}</p>
          <Link href="/support" className="secondary-button">Need help? Submit a support request</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <BrandHeader />
      <section className="onboarding-layout">
        <aside className="progress-rail">
          <p className="eyebrow">BOOST STARTS HERE</p>
          <h1>Tell us what matters. <span>We will build the path forward.</span></h1>
          <p className="rail-copy">A stronger start creates clearer tracking and better results. This guided onboarding takes you through the information and access Ezzey needs to begin correctly.</p>
          <ol className="step-list">
            {steps.map((item, index) => (
              <li key={item.id} className={index === step ? "active" : index < step ? "done" : ""}>
                <span>{index < step ? <Check size={14} /> : String(index + 1).padStart(2, "0")}</span>
                <b>{item.label}</b>
              </li>
            ))}
          </ol>
          <div className="rail-note"><ShieldCheck size={18} /><span>We never ask for Google passwords. Secure access is granted through the link provided.</span></div>
        </aside>

        <section className="form-canvas">
          <div className="form-canvas-header">
            <p className="eyebrow">STEP {String(step + 1).padStart(2, "0")} OF {String(steps.length).padStart(2, "0")}</p>
            <span>{currentTitle}</span>
          </div>

          <label className="honeypot" aria-hidden="true">Company website<input tabIndex={-1} autoComplete="off" value={String(form.companyWebsite)} onChange={event => setValue("companyWebsite", event.target.value)} /></label>
          {step === 0 && <BusinessStep form={form} setValue={setValue} />}
          {step === 1 && <GoogleStep form={form} setValue={setValue} />}
          {step === 2 && <GoalsStep form={form} setValue={setValue} />}
          {step === 3 && <LeadFlowStep form={form} setValue={setValue} />}
          {step === 4 && <ReportingStep form={form} setValue={setValue} />}
          {step === 5 && <ReviewStep form={form} />}

          {error && <div className="form-error" role="alert"><CircleHelp size={18} />{error}</div>}
          <footer className="form-actions">
            {step > 0 ? <button type="button" className="back-button" onClick={() => { setError(""); setStep(previous => previous - 1); }}><ChevronLeft size={18} /> Back</button> : <span />}
            {step < steps.length - 1 ? <button type="button" className="primary-button" onClick={next}>Continue <ChevronRight size={18} /></button> : <button type="button" className="primary-button" disabled={pending} onClick={submit}>{pending ? <><Loader2 className="spin" size={18} /> Saving onboarding</> : <>Submit onboarding <Sparkles size={18} /></>}</button>}
          </footer>
        </section>
      </section>
    </main>
  );
}

function BusinessStep({ form, setValue }: { form: FormState; setValue: (key: string, value: string | boolean) => void }) {
  return <div className="step-content">
    <div className="step-intro"><h2>Start with your business.</h2><p>We will use your perspective to align the work with what matters most. We will handle the audit details that can be found from your online presence.</p></div>
    <div className="two-column"><Field label="First name" required><TextInput value={String(form.firstName)} onChange={value => setValue("firstName", value)} /></Field><Field label="Last name" required><TextInput value={String(form.lastName)} onChange={value => setValue("lastName", value)} /></Field></div>
    <div className="two-column"><Field label="Best email address" required><TextInput type="email" value={String(form.email)} onChange={value => setValue("email", value)} /></Field><Field label="Business name" required><TextInput value={String(form.companyName)} onChange={value => setValue("companyName", value)} /></Field></div>
    <Field label="Your role in the business"><TextInput value={String(form.businessRole)} placeholder="Owner, marketing manager, operations lead..." onChange={value => setValue("businessRole", value)} /></Field>
    <Field label="What is your website address?" required><RadioOptions name="websiteMode" value={String(form.websiteMode)} onChange={value => setValue("websiteMode", value)} options={[["url", "My business has a website"], ["none", "My business does not currently have a website"], ["unknown", "I am not sure of the website address"]]} />{form.websiteMode === "url" && <TextInput value={String(form.website)} placeholder="https://yourbusiness.com" onChange={value => setValue("website", value)} />}</Field>
    <Field label="In your own words, what does your business do and what products or services do you provide?" required><TextArea value={String(form.businessDescription)} onChange={value => setValue("businessDescription", value)} /></Field>
    <Field label="What services, products, customer types, or jobs do you most want to grow?" required><TextArea value={String(form.growthFocus)} onChange={value => setValue("growthFocus", value)} /></Field>
    <Field label="What cities, neighborhoods, ZIP codes, or geographic areas do you most want to grow in?" required><TextArea value={String(form.growthAreas)} onChange={value => setValue("growthAreas", value)} /></Field>
    <Field label="What is the single most important outcome you want BOOST to improve first?" required><RadioOptions name="primaryOutcome" value={String(form.primaryOutcome)} onChange={value => setValue("primaryOutcome", value)} options={primaryOutcomes.map(option => [option, option] as const)} /></Field>
    <Field label="What makes your business different or especially valuable to customers?"><TextArea value={String(form.differentiator)} onChange={value => setValue("differentiator", value)} /></Field>
    <Field label="Are there services, job types, customers, or locations that you do not want to target?"><TextArea value={String(form.exclusions)} onChange={value => setValue("exclusions", value)} /></Field>
  </div>;
}

function GoogleStep({ form, setValue }: { form: FormState; setValue: (key: string, value: string | boolean) => void }) {
  const state = String(form.googleProfileState);
  const setupPath = state === "unverified" || state === "no_profile";
  return <div className="step-content">
    <div className="step-intro"><h2>Connect the foundation.</h2><p>Your Google Business Profile is a core part of how customers discover and evaluate your business. Choose the statement that best describes your situation.</p></div>
    <Field label="Which statement best describes your Google Business Profile today?" required><RadioOptions name="googleProfileState" value={state} onChange={value => setValue("googleProfileState", value)} options={googleProfileOptions} /></Field>
    {state === "verified_accessible" && <div className="conditional-panel positive"><ShieldCheck size={24}/><div><h3>Great. Your profile is verified and available.</h3><p>Use the secure link below to give Ezzey access. It takes only a few clicks and lets us start from accurate information, establish better tracking, and measure progress more clearly.</p><div className="inline-actions"><a className="access-button" href={LINKS.leadsie} target="_blank" rel="noreferrer">Give Ezzey Google access <ExternalLink size={16}/></a><a className="text-link" href={LINKS.googleBusiness} target="_blank" rel="noreferrer">Not sure which email manages the profile? Check Google settings <ExternalLink size={14}/></a></div></div><Field label="Were you able to complete the secure Google Business Profile access step?" required><RadioOptions name="googleAccessCompletion" value={String(form.googleAccessCompletion)} onChange={value => setValue("googleAccessCompletion", value)} options={[["Yes, I completed it", "Yes, I completed it"], ["I need help", "I need help"], ["I will complete it later", "I will complete it later"], ["I could not complete it", "I could not complete it"]]} />{["I need help", "I could not complete it"].includes(String(form.googleAccessCompletion)) && <TextArea value={String(form.googleAccessBlocker)} placeholder="Please tell us what prevented the access step." onChange={value => setValue("googleAccessBlocker", value)} />}</Field></div>}
    {setupPath && <SetupPath form={form} setValue={setValue} />}
    {state === "verified_no_access" && <RecoveryPath form={form} setValue={setValue} />}
    {state === "not_sure" && <UnsurePath form={form} setValue={setValue} />}
  </div>;
}

function SetupPath({ form, setValue }: { form: FormState; setValue: (key: string, value: string | boolean) => void }) {
  const noProfile = form.googleProfileState === "no_profile";
  const needsAddress = ["Customers come to my physical business location", "My business travels to customers", "Both"].includes(String(form.serviceMode));
  const verifiedNow = form.setupStatus === "I have completed setup and verification";

  return <div className="conditional-panel">
    <div className="video-frame video-link-frame"><a href={LINKS.setupVideo} target="_blank" rel="noreferrer"><PlayCircle size={34}/><span><b>Watch the Google Business Profile setup and verification video</b><small>Opens the supplied instructional video on YouTube</small></span><ExternalLink size={18}/></a></div>
    <div className="video-copy"><PlayCircle size={24}/><div><h3>Set up and verify your Google Business Profile</h3><p>Customers without a profile or with an unverified profile follow this same instruction path. Watch the short video, then tell us where you are in the process.</p></div></div>
    {noProfile && <>
      <Field label="How does your business serve customers?" required><RadioOptions name="serviceMode" value={String(form.serviceMode)} onChange={value => setValue("serviceMode", value)} options={[["Customers come to my physical business location", "Customers come to my physical business location"], ["My business travels to customers", "My business travels to customers"], ["Both", "Both"], ["My business operates online only", "My business operates online only"], ["Other / not sure", "Other / not sure"]]} /></Field>
      {needsAddress && <Field label="What is the physical address of your business?" hint="Service-area businesses can keep an address hidden from public view when appropriate." required><TextArea value={String(form.businessAddress)} onChange={value => setValue("businessAddress", value)} /></Field>}
      <div className="two-column"><Field label="What phone number should customers use to reach your business?" required><TextInput value={String(form.businessPhone)} onChange={value => setValue("businessPhone", value)} /></Field><Field label="What are your normal customer-facing business hours?" required><TextInput value={String(form.businessHours)} placeholder="Monday to Friday, 8:00 AM to 5:00 PM" onChange={value => setValue("businessHours", value)} /></Field></div>
      <Field label="Are you authorized to create, claim, or manage your business's Google Business Profile?" required><RadioOptions name="googleAuthority" value={String(form.googleAuthority)} onChange={value => setValue("googleAuthority", value)} options={[["Yes", "Yes"], ["No", "No"], ["I am not sure", "I am not sure"]]} /></Field>
    </>}
    <Field label="After reviewing the video, what is your next step?" required><RadioOptions name="setupStatus" value={String(form.setupStatus)} onChange={value => setValue("setupStatus", value)} options={[["I will set up or verify the profile now", "I will set up or verify the profile now"], ["I have started the process and verification is pending", "I have started the process and verification is pending"], ["I have completed setup and verification", "I have completed setup and verification"], ["I need help", "I need help"]]} />{form.setupStatus === "I need help" && <TextArea value={String(form.setupHelp)} placeholder="Please describe what you need help with." onChange={value => setValue("setupHelp", value)} />}</Field>
    {verifiedNow && <div className="setup-complete-callout"><b>Profile now verified?</b><p>Use the secure access link to give Ezzey access and allow work to begin.</p><a className="access-button" href={LINKS.leadsie} target="_blank" rel="noreferrer">Open secure access link <ExternalLink size={16}/></a><div className="access-confirmation"><Field label="Were you able to complete the secure Google Business Profile access step?" required><RadioOptions name="googleAccessCompletion" value={String(form.googleAccessCompletion)} onChange={value => setValue("googleAccessCompletion", value)} options={[["Yes, I completed it", "Yes, I completed it"], ["I need help", "I need help"], ["I will complete it later", "I will complete it later"], ["I could not complete it", "I could not complete it"]]} />{["I need help", "I could not complete it"].includes(String(form.googleAccessCompletion)) && <TextArea value={String(form.googleAccessBlocker)} placeholder="Please tell us what prevented the access step." onChange={value => setValue("googleAccessBlocker", value)} />}</Field></div></div>}
  </div>;
}

function RecoveryPath({ form, setValue }: { form: FormState; setValue: (key: string, value: string | boolean) => void }) {
  return <div className="conditional-panel"><h3>Recover access to your verified profile.</h3><p>We will record the information needed to help you get access back without slowing down the rest of onboarding.</p><div className="two-column"><Field label="Who may be able to manage the profile?" hint="Optional"><TextInput value={String(form.recoveryContactName)} placeholder="Name or agency" onChange={value => setValue("recoveryContactName", value)} /></Field><Field label="Their email address" hint="Optional"><TextInput type="email" value={String(form.recoveryContactEmail)} onChange={value => setValue("recoveryContactEmail", value)} /></Field></div><Field label="What is the best description of the access issue?" required><RadioOptions name="recoveryIssue" value={String(form.recoveryIssue)} onChange={value => setValue("recoveryIssue", value)} options={[["A former employee or agency may have access", "A former employee or agency may have access"], ["Another owner or employee may have access", "Another owner or employee may have access"], ["I do not know who has access", "I do not know who has access"], ["I have tried to recover access and need help", "I have tried to recover access and need help"], ["Other", "Other"]]} /></Field><Field label="Would you like help resolving access to your profile?" required><RadioOptions name="recoveryHelp" value={String(form.recoveryHelp)} onChange={value => setValue("recoveryHelp", value)} options={[["Yes, I need help", "Yes, I need help"], ["No, I will handle it and return later", "No, I will handle it and return later"]]} /></Field>{form.recoveryHelp === "Yes, I need help" && <SupportHint />}</div>;
}

function UnsurePath({ form, setValue }: { form: FormState; setValue: (key: string, value: string | boolean) => void }) {
  return <div className="conditional-panel"><h3>Not sure about your profile status?</h3><p>That is okay. Please complete the remaining onboarding details so we can prepare your account correctly.</p><Field label="Would you like assistance checking your Google Business Profile status?" required><RadioOptions name="statusCheckHelp" value={String(form.statusCheckHelp)} onChange={value => setValue("statusCheckHelp", value)} options={[["Yes, I need help", "Yes, I need help"], ["No, I will check and return later", "No, I will check and return later"]]} /></Field>{form.statusCheckHelp === "Yes, I need help" && <SupportHint />}</div>;
}

function SupportHint() { return <div className="support-hint"><CircleHelp size={18}/><span>Need help now? <Link href="/support">Submit a BOOST support request</Link>.</span></div>; }

function GoalsStep({ form, setValue }: { form: FormState; setValue: (key: string, value: string | boolean) => void }) { return <div className="step-content"><div className="step-intro"><h2>Set the growth target.</h2><p>Your input helps us align the strategy with what you expect to happen. The market and keyword research itself is our job.</p></div><Field label="What would make BOOST successful for your business in the next 90 days?" required><TextArea value={String(form.success90)} onChange={value => setValue("success90", value)} /></Field><Field label="What would make BOOST successful over the next 12 months?"><TextArea value={String(form.successYear)} onChange={value => setValue("successYear", value)} /></Field><Field label="What types of new customers, projects, or jobs are most valuable to your business?" required><TextArea value={String(form.highValueWork)} onChange={value => setValue("highValueWork", value)} /></Field><Field label="Please list the competitors you consider most relevant to your business." hint="Optional. List names, websites, or locations if you know them. Leave blank if you are not sure."><TextArea value={String(form.competitors)} onChange={value => setValue("competitors", value)} /></Field><Field label="Are there particular services, customer requests, locations, or words you want us to keep in mind as we develop the strategy?" hint="Optional. Our team will perform the keyword and market research, but your perspective helps us align the strategy with your priorities."><TextArea value={String(form.optionalKeywords)} onChange={value => setValue("optionalKeywords", value)} /></Field></div>; }

function LeadFlowStep({ form, setValue }: { form: FormState; setValue: (key: string, value: string | boolean) => void }) { return <div className="step-content"><div className="step-intro"><h2>Show us how leads become customers.</h2><p>This helps us connect the visibility work with the customer journey and the results that matter.</p></div><Field label="What action is most valuable when a prospective customer finds you online?" required><RadioOptions name="primaryConversion" value={String(form.primaryConversion)} onChange={value => setValue("primaryConversion", value)} options={[["Phone call", "Phone call"], ["Quote or contact request", "Quote or contact request"], ["Appointment or booking", "Appointment or booking"], ["Website visit", "Website visit"], ["Directions or in-person visit", "Directions or in-person visit"], ["Other", "Other"]]} /></Field><Field label="Who usually responds to new phone calls, form submissions, or online inquiries?" required><TextArea value={String(form.responseOwner)} onChange={value => setValue("responseOwner", value)} /></Field><Field label="Do you currently use a call-tracking number?" required><RadioOptions name="callTracking" value={String(form.callTracking)} onChange={value => setValue("callTracking", value)} options={[["Yes, and I know the provider", "Yes, and I know the provider"], ["Yes, but I do not know the provider", "Yes, but I do not know the provider"], ["No", "No"], ["I am not sure", "I am not sure"]]} /></Field><Field label="Which best describes how you currently determine whether a new inquiry becomes a customer or booked job?" required><RadioOptions name="outcomesTracking" value={String(form.outcomesTracking)} onChange={value => setValue("outcomesTracking", value)} options={[["We track outcomes in a CRM or software system", "We track outcomes in a CRM or software system"], ["We track outcomes manually", "We track outcomes manually"], ["We know informally but do not record outcomes consistently", "We know informally but do not record outcomes consistently"], ["We do not currently track outcomes", "We do not currently track outcomes"], ["I am not sure", "I am not sure"]]} /></Field><Field label="Where do website quote requests, contact forms, or booking requests currently go?" hint="Optional. For example, an email inbox, CRM, scheduling system, or another person."><TextArea value={String(form.formDestination)} onChange={value => setValue("formDestination", value)} /></Field><Field label="Are there current problems with calls, form requests, bookings, or follow-up that you want us to know about?"><TextArea value={String(form.leadChallenges)} onChange={value => setValue("leadChallenges", value)} /></Field></div>; }

function ReportingStep({ form, setValue }: { form: FormState; setValue: (key: string, value: string | boolean) => void }) { return <div className="step-content"><div className="step-intro"><h2>Keep the right people informed.</h2><p>Clear reporting creates context, not just a list of impressions. Tell us who should receive meaningful updates.</p></div><Field label="Who should receive BOOST updates and reporting?" hint="Include full name, email address, and role for each recipient." required><TextArea value={String(form.reportRecipients)} placeholder="Jane Smith, jane@company.com, Owner" onChange={value => setValue("reportRecipients", value)} /></Field><Field label="How would you prefer to receive important BOOST updates?" required><RadioOptions name="communicationPreference" value={String(form.communicationPreference)} onChange={value => setValue("communicationPreference", value)} options={[["Email", "Email"], ["Text message", "Text message"], ["Phone call", "Phone call"], ["Other", "Other"]]} /></Field>{form.communicationPreference === "Text message" && <div className="conditional-panel"><Field label="What is the best mobile number for BOOST updates?" required><TextInput value={String(form.mobileNumber)} onChange={value => setValue("mobileNumber", value)} /></Field><label className="check-line"><input type="checkbox" checked={Boolean(form.smsConsent)} onChange={event => setValue("smsConsent", event.target.checked)} /><span>I agree to receive BOOST updates by text message at this number.</span></label></div>}<Field label="Is there anything else our team should know before we begin?"><TextArea value={String(form.notes)} onChange={value => setValue("notes", value)} /></Field></div>; }

function ReviewStep({ form }: { form: FormState }) { const setupPathComplete = ["unverified", "no_profile"].includes(String(form.googleProfileState)) && form.setupStatus === "I have completed setup and verification"; const accessReady = (form.googleProfileState === "verified_accessible" || setupPathComplete) && form.googleAccessCompletion === "Yes, I completed it"; return <div className="step-content"><div className="step-intro"><h2>Review your onboarding.</h2><p>When you submit, we will store your information and route the correct next step for your business.</p></div><div className="review-card"><div><span>Business</span><b>{form.companyName || "Not provided"}</b><p>{form.businessDescription || "Not provided"}</p></div><div><span>Growth focus</span><b>{form.growthFocus || "Not provided"}</b><p>{form.growthAreas || "Not provided"}</p></div><div><span>Google Business Profile</span><b>{String(form.googleProfileState || "Not provided").replaceAll("_", " ")}</b><p>{accessReady ? "Secure access step completed. Ezzey can begin internal fulfillment review." : "We will record the relevant next step, reminder, or support route."}</p></div><div><span>Primary outcome</span><b>{form.primaryOutcome || "Not provided"}</b><p>{form.success90 || "Not provided"}</p></div></div><div className={accessReady ? "ready-banner ready" : "ready-banner"}>{accessReady ? <><ShieldCheck size={20}/><span>Google access confirmed. This submission will be marked ready for fulfillment.</span></> : <><CircleHelp size={20}/><span>Google access is not yet confirmed. Submit the form now and complete the relevant Google step as soon as possible so work can begin.</span></>}</div></div>; }
