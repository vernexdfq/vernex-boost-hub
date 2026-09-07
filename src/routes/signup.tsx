import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { VerxorMark } from "@/components/brand";
import { SignupScreen } from "@/components/auth/signup-screen";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create Your Account — Verxor" },
      {
        name: "description",
        content: "Create your Verxor account and get started.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white px-4 py-6 text-slate-900 antialiased">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col">
        <header className="flex items-center justify-between">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
          </Link>
          <VerxorMark className="h-8 w-8 rounded-full" />
        </header>

        <main className="my-auto w-full py-6">
          <div className="mb-5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Create your account 🚀
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              Fill in your details below to get started for free
            </p>
          </div>

          <SignupScreen
            busy={false}
            onSuccess={(email) => {
              toast.success("Account created successfully");
              void navigate({ to: "/auth", replace: true });
              void email;
            }}
            onBack={() => void navigate({ to: "/auth", replace: true })}
          />
        </main>

        <footer className="pt-2 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-semibold">Bank-grade encryption - NDPR compliant</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
