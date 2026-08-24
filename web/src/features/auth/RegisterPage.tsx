import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./authContext";
import { registerSchema, type RegisterValues } from "./authSchemas";
import { AuthLayout } from "./AuthLayout";
import { ApiError } from "../../lib/apiClient";
import { TextField } from "../../components/TextFields";
import { Button } from "../../components/Button";

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null);
    try {
      await registerUser(values.email, values.username, values.password);
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start organizing your team's work in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-pine-700 underline-offset-2 hover:underline"
          >
            Sign in
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
          label="Username"
          id="username"
          autoComplete="username"
          {...register("username")}
          error={errors.username?.message}
        />
        <TextField
          label="Password"
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          error={errors.password?.message}
        />
        <Button type="submit" loading={isSubmitting} className="mt-2">
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
