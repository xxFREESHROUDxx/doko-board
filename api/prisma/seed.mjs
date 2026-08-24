/**
 * Demo data for local development:  npm run db:seed
 *
 * Idempotent. Users are upserted by email and the two demo projects are keyed
 * to fixed ids, so re-running replaces exactly those and leaves anything you
 * created yourself untouched.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const PASSWORD = "dokoboard123";

const USERS = {
  ada: {
    id: "11111111-1111-4111-8111-111111111111",
    email: "ada@dokoboard.dev",
    username: "ada_lovelace",
  },
  grace: {
    id: "22222222-2222-4222-8222-222222222222",
    email: "grace@dokoboard.dev",
    username: "grace_hopper",
  },
  alan: {
    id: "33333333-3333-4333-8333-333333333333",
    email: "alan@dokoboard.dev",
    username: "alan_turing",
  },
  edsger: {
    id: "44444444-4444-4444-8444-444444444444",
    email: "edsger@dokoboard.dev",
    username: "edsger_dijkstra",
  },
};

const HARVEST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MOBILE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

/** UTC midnight `days` from today — the same convention the web app sends. */
function dueIn(days) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const user of Object.values(USERS)) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { username: user.username, passwordHash },
      create: { ...user, passwordHash },
    });
  }

  // Cascades to members and tasks, so re-seeding is a clean replace.
  await prisma.project.deleteMany({ where: { id: { in: [HARVEST, MOBILE] } } });

  await prisma.project.create({
    data: {
      id: HARVEST,
      name: "Harvest Festival Site",
      description: "Marketing site and ticketing flow for the autumn festival.",
      members: {
        create: [
          { userId: USERS.ada.id, role: "OWNER" },
          { userId: USERS.grace.id, role: "ADMIN" },
          { userId: USERS.alan.id, role: "MEMBER" },
          { userId: USERS.edsger.id, role: "VIEWER" },
        ],
      },
      tasks: {
        create: [
          // Spread across all four columns, with overdue / today / future / undated
          // due dates so the board, the sort control and the overdue styling all
          // have something real to show.
          {
            title: "Book the sound engineer",
            description: "Two stages, Friday through Sunday.",
            status: "TODO",
            priority: "URGENT",
            dueDate: dueIn(-3),
            assigneeId: USERS.grace.id,
            createdById: USERS.ada.id,
          },
          {
            title: "Draft the vendor agreement",
            status: "TODO",
            priority: "HIGH",
            dueDate: dueIn(0),
            assigneeId: USERS.ada.id,
            createdById: USERS.ada.id,
          },
          {
            title: "Collect artist bios and photos",
            status: "TODO",
            priority: "LOW",
            dueDate: null,
            assigneeId: null,
            createdById: USERS.alan.id,
          },
          {
            title: "Build the ticket checkout page",
            description: "Card payments only for the first release.",
            status: "IN_PROGRESS",
            priority: "URGENT",
            dueDate: dueIn(2),
            assigneeId: USERS.alan.id,
            createdById: USERS.grace.id,
          },
          {
            title: "Wire up the seating chart",
            status: "IN_PROGRESS",
            priority: "MEDIUM",
            dueDate: dueIn(6),
            assigneeId: USERS.ada.id,
            createdById: USERS.ada.id,
          },
          {
            title: "Accessibility pass on the booking flow",
            description: "Keyboard-only run through, then a screen reader pass.",
            status: "IN_REVIEW",
            priority: "HIGH",
            dueDate: dueIn(-1),
            assigneeId: USERS.grace.id,
            createdById: USERS.grace.id,
          },
          {
            title: "Copy review for the landing page",
            status: "IN_REVIEW",
            priority: "LOW",
            dueDate: dueIn(9),
            assigneeId: USERS.edsger.id,
            createdById: USERS.ada.id,
          },
          {
            title: "Set up the staging environment",
            status: "DONE",
            priority: "MEDIUM",
            dueDate: dueIn(-8),
            assigneeId: USERS.alan.id,
            createdById: USERS.alan.id,
          },
          {
            title: "Agree the brand palette",
            description: "Pine and marigold, neutrals from stone.",
            status: "DONE",
            priority: "HIGH",
            dueDate: dueIn(-14),
            assigneeId: USERS.ada.id,
            createdById: USERS.ada.id,
          },
        ],
      },
    },
  });

  await prisma.project.create({
    data: {
      id: MOBILE,
      name: "Mobile App v2",
      description: "Rebuild the companion app on the new API.",
      members: {
        create: [
          { userId: USERS.ada.id, role: "OWNER" },
          { userId: USERS.grace.id, role: "MEMBER" },
        ],
      },
      tasks: {
        create: [
          {
            title: "Spike: offline task cache",
            status: "TODO",
            priority: "MEDIUM",
            dueDate: dueIn(12),
            assigneeId: USERS.grace.id,
            createdById: USERS.ada.id,
          },
          {
            title: "Port the auth flow",
            status: "IN_PROGRESS",
            priority: "HIGH",
            dueDate: dueIn(4),
            assigneeId: USERS.ada.id,
            createdById: USERS.ada.id,
          },
          {
            title: "Decide on the navigation library",
            status: "DONE",
            priority: "LOW",
            dueDate: null,
            assigneeId: null,
            createdById: USERS.grace.id,
          },
        ],
      },
    },
  });

  const [projects, tasks] = await Promise.all([
    prisma.project.count(),
    prisma.task.count(),
  ]);

  console.log(`\n  Seeded ${projects} project(s) and ${tasks} task(s).\n`);
  console.log("  Sign in with any of these — password is the same for all:\n");
  for (const [key, user] of Object.entries(USERS)) {
    const role = { ada: "owner", grace: "admin", alan: "member", edsger: "viewer" }[key];
    console.log(`    ${user.email.padEnd(24)} ${PASSWORD}   (${role} on Harvest Festival Site)`);
  }
  console.log("");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
