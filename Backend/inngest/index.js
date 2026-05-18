import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodeMailer.js";

// Create Inngest client
export const inngest = new Inngest({ id: "my-app" });

// Sync user creation
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: [{ event: "clerk/user.created" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.create({
      data: {
        id: data.id,
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name || ""} ${data?.last_name || ""}`,
        image: data?.image_url,
      },
    });
  }
);

// Sync user deletion
const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-from-clerk",
    triggers: [{ event: "clerk/user.deleted" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.delete({
      where: {
        id: data.id,
      },
    });
  }
);

// Sync user updation
const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
    triggers: [{ event: "clerk/user.updated" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.update({
      where: {
        id: data.id,
      },
      data: {
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name || ""} ${data?.last_name || ""}`,
        image: data?.image_url,
      },
    });
  }
);


// Create workspace
const syncWorkspaceCreation = inngest.createFunction(
  {
    id: "sync-workspace-from-clerk",
    triggers: [{ event: "clerk/organization.created" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspace.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url,
      },
    });

    // Add creator as ADMIN
    await prisma.workspaceMember.create({
      data: {
        userId: data.created_by,
        workspaceId: data.id,
        role: "ADMIN",
      },
    });
  }
);

// Update workspace
const syncWorkspaceUpdation = inngest.createFunction(
  {
    id: "update-workspace-from-clerk",
    triggers: [{ event: "clerk/organization.updated" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspace.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        slug: data.slug,
        image_url: data.image_url,
      },
    });
  }
);

// Delete workspace
const syncWorkspaceDeletion = inngest.createFunction(
  {
    id: "delete-workspace-from-clerk",
    triggers: [{ event: "clerk/organization.deleted" }],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspace.delete({
      where: {
        id: data.id,
      },
    });
  }
);

// Add workspace member
const syncWorkspaceMemberCreation = inngest.createFunction(
  {
    id: "sync-workspace-member-from-clerk",
    triggers: [
      { event: "clerk/organizationInvitation.created" },
    ],
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspaceMember.create({
      data: {
        userId: data.user_id,
        workspaceId: data.organization.id,
        role: String(data.role).includes("admin") ? "ADMIN" : "MEMBER",
      },
    });
  }
);

// Inngest Function to send email on task Creation
const sendTaskAssignmentEmail = inngest.createFunction(
  {
    id: "send-task-assignment-mail",
    triggers: [{ event: "app/task.assigned" }],
  },
  async ({ event, step }) => {
    const { taskId, origin } = event.data;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: true, project: true },
    });

    if (!task || !task.assignee?.email) return;

    await sendEmail({
      to: task.assignee.email,
      subject: `New Assignment in ${task.project.name}`,
      body: `
        <div style="max-width:600px;">
          <h2>Hi ${task.assignee.name}</h2>
          <p>You have been assigned a new task:</p>
          <p style="font-size:18px;font-weight:bold;color:#007bff;">${task.title}</p>
          <p><strong>Description:</strong> ${task.description || "No description"}</p>
          <p><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
          <a href="${origin}" style="background-color:#007bff;padding:12px 24px;border-radius:5px;color:#fff;text-decoration:none;">
            View Task
          </a>
        </div>
      `,
    });

    if (task.due_date && task.status !== "DONE") {
      await step.sleepUntil("wait-for-due-date", new Date(task.due_date));

      await step.run("send-task-reminder-mail", async () => {
        const latestTask = await prisma.task.findUnique({
          where: { id: taskId },
          include: { assignee: true, project: true },
        });

        if (!latestTask || latestTask.status === "DONE") return;

        await sendEmail({
          to: latestTask.assignee.email,
          subject: `Reminder for ${latestTask.project.name}`,
          body: `
            <div style="max-width:600px;">
              <h2>Hi ${latestTask.assignee.name}</h2>
              <p>Your task is still pending:</p>
              <p style="font-size:18px;font-weight:bold;color:#007bff;">${latestTask.title}</p>
              <p><strong>Due Date:</strong> ${new Date(latestTask.due_date).toLocaleDateString()}</p>
              <a href="${origin}" style="background-color:#007bff;padding:12px 24px;border-radius:5px;color:#fff;text-decoration:none;">
                View Task
              </a>
            </div>
          `,
        });
      });
    }
  }
);

// Export all functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  syncWorkspaceCreation,
  syncWorkspaceUpdation,
  syncWorkspaceDeletion,
  syncWorkspaceMemberCreation,
  sendTaskAssignmentEmail,
];