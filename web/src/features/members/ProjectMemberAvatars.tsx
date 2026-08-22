import { useProjectMembers } from "./api";
import { AvatarStack } from "../../components/AvatarStack";

/** The project's member cluster for the top bar. Stays quiet while loading or on error. */
export function ProjectMemberAvatars({ projectId }: { projectId: string }) {
  const { data: members } = useProjectMembers(projectId);

  if (!members || members.length === 0) return null;

  const names = members.map((member) => member.user.username);

  return (
    <AvatarStack
      names={names}
      label={`Project members: ${names.join(", ")}`}
      max={4}
      size="md"
      className="hidden sm:flex"
    />
  );
}
