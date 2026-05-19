import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

// Create Task
export const createTask = async (req, res) => {
    try {
        const userId = req.userId;

        const {
            projectId,
            title,
            description,
            type,
            status,
            priority,
            assigneeId,
            due_date,
        } = req.body;

        const origin = req.get("origin");

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                members: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        if (project.team_lead !== userId) {
            return res.status(403).json({
                message: "You don't have admin privileges for this project",
            });
        }

        if (
            assigneeId &&
            !project.members.find((member) => member.userId === assigneeId)
        ) {
            return res.status(400).json({
                message: "Assignee is not a member of the project",
            });
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                type,
                priority,
                assigneeId,
                status,
                due_date: new Date(due_date),
            },
        });

        const taskWithAssignee = await prisma.task.findUnique({
            where: { id: task.id },
            include: {
                assignee: true,
                comments: {
                    include: {
                        user: true,
                    },
                },
                project: true,
            },
        });

        await inngest.send({
            name: "app/task.assigned",
            data: {
                taskId: task.id,
                origin,
            },
        });

        return res.json({
            task: taskWithAssignee,
            message: "Task created successfully",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: error.code || error.message,
        });
    }
};

// Update Task
export const updateTask = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        const existingTask = await prisma.task.findUnique({
            where: { id },
        });

        if (!existingTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        const project = await prisma.project.findUnique({
            where: { id: existingTask.projectId },
            include: {
                members: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const isTeamLead = project.team_lead === userId;
        const isAssignee = existingTask.assigneeId === userId;

        if (!isTeamLead && !isAssignee) {
            return res.status(403).json({
                message: "You don't have permission to update this task",
            });
        }

        const allowedData = {};

        if (req.body.title !== undefined) allowedData.title = req.body.title;
        if (req.body.description !== undefined) allowedData.description = req.body.description;
        if (req.body.type !== undefined) allowedData.type = req.body.type;
        if (req.body.status !== undefined) allowedData.status = req.body.status;
        if (req.body.priority !== undefined) allowedData.priority = req.body.priority;
        if (req.body.assigneeId !== undefined) allowedData.assigneeId = req.body.assigneeId;
        if (req.body.due_date !== undefined) {
            allowedData.due_date = new Date(req.body.due_date);
        }

        await prisma.task.update({
            where: { id },
            data: allowedData,
        });

        const taskWithAssignee = await prisma.task.findUnique({
            where: { id },
            include: {
                assignee: true,
                comments: {
                    include: {
                        user: true,
                    },
                },
                project: true,
            },
        });

        return res.json({
            task: taskWithAssignee,
            message: "Task updated successfully",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: error.code || error.message,
        });
    }
};

// Delete Task
export const deleteTask = async (req, res) => {
    try {
        const userId = req.userId;
        const taskIds = req.body.taskIds || req.body.taskId;

        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({
                message: "No task IDs provided",
            });
        }

        const tasks = await prisma.task.findMany({
            where: {
                id: {
                    in: taskIds,
                },
            },
        });

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Tasks not found",
            });
        }

        const project = await prisma.project.findUnique({
            where: {
                id: tasks[0].projectId,
            },
        });

        if (!project) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        if (project.team_lead !== userId) {
            return res.status(403).json({
                message: "You don't have admin privileges for this project",
            });
        }

        await prisma.task.deleteMany({
            where: {
                id: {
                    in: taskIds,
                },
            },
        });

        return res.json({
            taskIds,
            message: "Task deleted successfully",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: error.code || error.message,
        });
    }
};