import { useProjectMembers } from "./api";
import { AvatarStack } from "../../components/AvatarStack";

/** The project's member cluster for the top bar. Stays quiet while loading or on error. */
export function ProjectMemberAvatars({ projectId }: { projectId: string }) {
  const { data: members } = useProjectMembers(projectId);

  if (!members || members.length === 0) return null;

  const people = members.map((member) => ({
    name: member.user.username,
    avatarUrl: member.user.avatarUrl,
  }));

  return (
    <AvatarStack
      people={people}
      label={`Project members: ${people.map((person) => person.name).join(", ")}`}
      max={4}
      size="md"
      className="hidden sm:flex"
    />
  );
}
