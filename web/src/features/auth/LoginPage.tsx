import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./authContext";
import { loginSchema, type LoginValues } from "./authSchemas";
import { AuthLayout } from "./AuthLayout";
import { ApiError } from "../../lib/apiClient";
import { TextField } from "../../components/TextFields";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      const to = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(to, { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up where your team left off."
      footer={
        <>
          New here?{" "}
          <Link
            to="/register"
            className="font-medium text-pine-700 underline-offset-2 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          >
            {formError}
          </div>
        )}
        <TextField
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          error={errors.email?.message}
        />
        <TextField
          label="Password"
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
          error={errors.password?.message}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 cursor-pointer rounded-lg bg-pine-900 px-4 py-2.5 font-medium text-paper transition hover:bg-pine-700 focus:outline-none focus:ring-2 focus:ring-marigold-500/50 disabled:opacity-60"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
