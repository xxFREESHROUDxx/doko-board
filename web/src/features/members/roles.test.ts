import { describe, expect, it } from "vitest";
import {
  canAdminister,
  canChangeMemberRole,
  canDeleteProject,
  canDeleteTask,
  canRemoveMember,
} from "./roles";

describe("canAdminister", () => {
  it("allows owners and admins only", () => {
    expect(canAdminister("OWNER")).toBe(true);
    expect(canAdminister("ADMIN")).toBe(true);
    expect(canAdminister("MEMBER")).toBe(false);
    expect(canAdminister("VIEWER")).toBe(false);
    expect(canAdminister(null)).toBe(false);
  });
});

describe("canDeleteProject", () => {
  it("is owner-only", () => {
    expect(canDeleteProject("OWNER")).toBe(true);
    expect(canDeleteProject("ADMIN")).toBe(false);
    expect(canDeleteProject(null)).toBe(false);
  });
});

describe("canRemoveMember", () => {
  it("never allows removing the owner", () => {
    expect(canRemoveMember("OWNER", "OWNER")).toBe(false);
    expect(canRemoveMember("ADMIN", "OWNER")).toBe(false);
  });

  it("stops an admin removing a peer admin, but lets the owner do it", () => {
    expect(canRemoveMember("ADMIN", "ADMIN")).toBe(false);
    expect(canRemoveMember("OWNER", "ADMIN")).toBe(true);
  });

  it("lets admins and owners remove members and viewers", () => {
    expect(canRemoveMember("ADMIN", "MEMBER")).toBe(true);
    expect(canRemoveMember("ADMIN", "VIEWER")).toBe(true);
    expect(canRemoveMember("OWNER", "MEMBER")).toBe(true);
  });

  it("denies non-admins outright", () => {
    expect(canRemoveMember("MEMBER", "VIEWER")).toBe(false);
    expect(canRemoveMember("VIEWER", "MEMBER")).toBe(false);
    expect(canRemoveMember(null, "MEMBER")).toBe(false);
  });
});

describe("canChangeMemberRole", () => {
  it("leaves the owner's role fixed", () => {
    expect(canChangeMemberRole("OWNER", "OWNER")).toBe(false);
  });

  it("lets an admin change a peer admin (unlike removal)", () => {
    expect(canChangeMemberRole("ADMIN", "ADMIN")).toBe(true);
  });

  it("denies non-admins", () => {
    expect(canChangeMemberRole("MEMBER", "VIEWER")).toBe(false);
    expect(canChangeMemberRole(null, "VIEWER")).toBe(false);
  });
});

describe("canDeleteTask", () => {
  const me = "user-1";

  it("lets owners and admins delete anything", () => {
    expect(canDeleteTask("OWNER", "someone-else", me)).toBe(true);
    expect(canDeleteTask("ADMIN", "someone-else", me)).toBe(true);
  });

  it("lets a member delete only their own task", () => {
    expect(canDeleteTask("MEMBER", me, me)).toBe(true);
    expect(canDeleteTask("MEMBER", "someone-else", me)).toBe(false);
  });

  it("treats an orphaned task (null creator) as not-yours", () => {
    expect(canDeleteTask("MEMBER", null, me)).toBe(false);
    expect(canDeleteTask("VIEWER", null, me)).toBe(false);
  });

  it("denies non-members", () => {
    expect(canDeleteTask(null, me, me)).toBe(false);
  });
});
