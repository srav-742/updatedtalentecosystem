import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  MonitorUp,
  Play,
  ShieldCheck
} from 'lucide-react';

function PermissionVisual({ step }) {
  if (step === 1) {
    return (
      <div className="rounded-[2rem] bg-[#f4efe6] p-8">
        <div className="mx-auto max-w-sm rounded-[1.75rem] border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-900">Allow this site to see your screen?</p>
          <div className="mt-4 rounded-2xl border border-black/10 bg-[#f8f5ef] px-4 py-3 text-sm text-gray-500">
            Entire screen
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-black/10 px-4 py-3">
            <span className="text-sm text-gray-500">Share only entire screen</span>
            <div className="h-5 w-5 rounded-full border border-emerald-300 bg-emerald-100" />
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <div className="rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-500">Block</div>
            <div className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white">Allow</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] bg-[#f4efe6] p-8">
      <div className="mx-auto flex max-w-sm flex-col items-center rounded-[1.75rem] border border-black/10 bg-white px-6 py-10 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={28} />
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-tight text-gray-900">Environment ready</h3>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          Screen-sharing guidance is complete and the challenge is ready to begin.
        </p>
        <div className="mt-6 w-full rounded-2xl border border-black/10 bg-[#fbf8f3] px-4 py-3 text-left text-sm text-gray-600">
          You will stay in fullscreen mode, and suspicious tab or window switches will be tracked during the attempt.
        </div>
      </div>
    </div>
  );
}

export default function StrictScreenSharePrompt({
  error,
  onShare,
  warningLimit = 3,
  resetLimit = 4,
  isResumePrompt = false,
}) {
  const [step, setStep] = useState(0);

  const totalFlags = useMemo(() => Math.max(resetLimit, warningLimit), [resetLimit, warningLimit]);
  const steps = [
    {
      eyebrow: 'Assessment setup',
      title: 'Welcome to the assessment',
      description: 'Before you begin, please review the challenge expectations and the fair-assessment policy.',
      details: [
        'Your answers will be evaluated against the job requirements attached to this role.',
        'Keep this browser tab active from start to submission.',
        'Do not open new tabs, switch windows, or stop screen sharing during the assessment.',
        `You have ${totalFlags} total security flags. If the limit is exceeded, the assessment is automatically terminated.`
      ],
      footer: 'Click Next to continue to permissions.'
    },
    {
      eyebrow: 'Permission 1/2',
      title: 'Allow entire screen sharing',
      description: 'Share your entire screen, not just a window or browser tab, before the assessment starts.',
      details: [
        'Click the allow screen-sharing button when prompted.',
        'Select Entire Screen from the browser permission dialog.',
        'Keep sharing active until the assessment is complete.',
        'If screen sharing stops, the assessment will pause until you resume it.'
      ],
      footer: 'Next, you will confirm the final exam-readiness checklist.'
    },
    {
      eyebrow: 'Ready to begin',
      title: 'You are ready to start the challenge',
      description: 'Review the final checklist below, then begin the secure assessment.',
      details: [
        'Read each question carefully before responding.',
        'Do not refresh the page once the assessment starts.',
        'Keep your internet connection stable and stay focused on the current screen.',
        'After finishing the assessment, you will continue to the next stage of the application flow.'
      ],
      footer: 'When you are ready, start screen sharing and enter the assessment.'
    }
  ];

  if (isResumePrompt) {
    return (
      <div className="fixed inset-0 z-[99999] bg-[#f7f4ee] px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto flex h-full max-w-3xl items-center justify-center">
          <div className="w-full rounded-[2.5rem] border border-black/10 bg-white p-8 shadow-[0_40px_120px_rgba(15,23,42,0.12)] md:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-red-50 text-red-500">
              <AlertTriangle size={30} />
            </div>
            <div className="mt-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Screen share required</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">Your screen sharing has stopped</h2>
              <p className="mt-4 text-sm leading-7 text-gray-500">
                Share your entire screen again before the exam can continue. The assessment remains protected while the session is paused.
              </p>
            </div>

            <div className="mt-8 rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-6">
              <div className="space-y-3 text-sm leading-7 text-gray-600">
                <p>1. Click the button below to reopen browser screen-sharing.</p>
                <p>2. Choose Entire Screen in the permission dialog.</p>
                <p>3. Return to fullscreen once sharing resumes.</p>
              </div>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            <button
              onClick={onShare}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              <MonitorUp size={18} />
              Share Entire Screen Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeStep = steps[step];
  const isLastStep = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-[#f7f4ee] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex min-h-full max-w-[1320px] items-center">
        <div className="w-full overflow-hidden rounded-[2.5rem] border border-black/10 bg-white shadow-[0_50px_140px_rgba(15,23,42,0.14)]">
          <div className="grid min-h-[760px] lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col px-8 py-10 md:px-12 md:py-12">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">{activeStep.eyebrow}</p>
                  <h2 className="mt-4 text-4xl font-semibold tracking-tight text-gray-900">{activeStep.title}</h2>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-gray-500">{activeStep.description}</p>
                </div>
                <div className="hidden rounded-full border border-black/10 bg-[#f8f4ed] px-4 py-2 text-sm font-medium text-gray-700 md:block">
                  {step + 1}/{steps.length}
                </div>
              </div>

              <div className="mt-12 space-y-8">
                <div className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Fair assessment policy</p>
                      <p className="text-lg font-semibold text-gray-900">Protected challenge environment</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {activeStep.details.map((detail) => (
                      <div key={detail} className="flex items-start gap-3">
                        <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-black text-white">
                          <CheckCircle2 size={14} />
                        </div>
                        <p className="text-sm leading-7 text-gray-600">{detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                ) : null}

                <p className="text-sm italic text-gray-500">{activeStep.footer}</p>
              </div>
            </div>

            <div className="border-t border-black/10 bg-[#fcfaf6] px-8 py-10 lg:border-l lg:border-t-0 md:px-12 md:py-12">
              <div className="flex h-full flex-col justify-between gap-10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Environment setup</p>
                  <div className="mt-5 flex items-center gap-3">
                    {steps.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 flex-1 rounded-full transition ${index <= step ? 'bg-black' : 'bg-black/10'}`}
                      />
                    ))}
                  </div>
                </div>

                <PermissionVisual step={step} />

                <div className="flex items-center justify-between gap-4 border-t border-black/10 pt-6">
                  <button
                    onClick={() => setStep((current) => Math.max(0, current - 1))}
                    className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${step === 0 ? 'cursor-not-allowed border border-black/10 bg-gray-100 text-gray-400' : 'border border-black/10 bg-white text-gray-700 hover:bg-[#faf7f1]'}`}
                    disabled={step === 0}
                  >
                    Back
                  </button>

                  {isLastStep ? (
                    <button
                      onClick={onShare}
                      className="inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                    >
                      <Play size={16} />
                      Share Screen and Start
                    </button>
                  ) : (
                    <button
                      onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
                      className="inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                    >
                      Next
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
