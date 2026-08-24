import { useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUpdateProfile, type UpdateProfileInput } from "./api";
import { useAuth } from "../auth/authContext";
import { ApiError } from "../../lib/apiClient";
import { fileToAvatarDataUri } from "../../lib/avatar";
import { useToast } from "../../components/toastContext";
import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { TextField } from "../../components/TextFields";

// Mirrors UpdateProfileDto, which in turn matches the registration rules.
const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .pipe(z.email("Enter a valid email")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface EditProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export function EditProfileDialog({ open, onClose }: EditProfileDialogProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const updateProfile = useUpdateProfile();
  const fileInput = useRef<HTMLInputElement>(null);

  // undefined means "leave the picture alone"; null means "remove it".
  const [avatar, setAvatar] = useState<string | null | undefined>(undefined);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: user?.username ?? "", email: user?.email ?? "" },
  });

  if (!user) return null;

  const shownAvatar = avatar === undefined ? user.avatarUrl : avatar;
  const avatarChanged = avatar !== undefined;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset immediately so choosing the same file twice still fires a change.
    event.target.value = "";
    if (!file) return;

    setAvatarError(null);
    try {
      setAvatar(await fileToAvatarDataUri(file));
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "That image couldn't be used.");
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    setFormError(null);

    // Send only what changed: the API treats an absent key as "leave it".
    const input: UpdateProfileInput = {};
    if (values.username !== user.username) input.username = values.username;
    if (values.email !== user.email) input.email = values.email;
    if (avatarChanged) input.avatarUrl = avatar ?? null;

    if (Object.keys(input).length === 0) {
      onClose();
      return;
    }

    try {
      await updateProfile.mutateAsync(input);
      showToast("Profile updated");
      onClose();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit profile" busy={isSubmitting}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          >
            {formError}
          </div>
        )}

        <div className="flex items-center gap-4">
          <Avatar
            name={user.username}
            src={shownAvatar}
            aria-hidden="true"
            className="h-16 w-16 text-lg"
          />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => fileInput.current?.click()}>
                {shownAvatar ? "Change picture" : "Upload picture"}
              </Button>
              {shownAvatar && (
                <Button variant="ghost" onClick={() => setAvatar(null)}>
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-ink/50">
              Cropped to a square and resized to 128px before uploading.
            </p>
          </div>
          {/* The styled buttons above are the real control; this stays hidden
              because a raw file input cannot be restyled consistently. */}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        {avatarError && (
          <p role="alert" className="-mt-3 text-sm text-red-600">
            {avatarError}
          </p>
        )}

        <TextField
          label="Username"
          id="profile-username"
          data-autofocus
          autoComplete="username"
          {...register("username")}
          error={errors.username?.message}
        />
        <TextField
          label="Email"
          id="profile-email"
          type="email"
          autoComplete="email"
          {...register("email")}
          error={errors.email?.message}
        />

        <div className="mt-1 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty && !avatarChanged}>
            {isSubmitting ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
