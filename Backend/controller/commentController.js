import prisma from "../configs/prisma.js";

// Add comment
export const addComment = async (req, res) => {
    try {
        const userId = req.userId;
        const { content, taskId } = req.body;

        if (!content || !taskId) {
            return res.status(400).json({
                message: "Content and taskId are required",
            });
        }

        const task = await prisma.task.findUnique({
            where: { id: taskId },
        });

        if (!task) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        const project = await prisma.project.findUnique({
            where: { id: task.projectId },
            include: {
                members: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!project) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        const member = project.members.find(
            (member) => member.userId === userId
        );

        if (!member) {
            return res.status(403).json({
                message: "You are not a member of this project",
            });
        }

        const comment = await prisma.comment.create({
            data: {
                taskId,
                content,
                userId,
            },
            include: {
                user: true,
            },
        });

        return res.json({
            comment,
            message: "Comment added successfully",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: error.code || error.message,
        });
    }
};

// Get comments on task
export const getTaskComment = async (req, res) => {
    try {
        const { taskId } = req.params;

        const comments = await prisma.comment.findMany({
            where: {
                taskId,
            },
            include: {
                user: true,
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        return res.json({
            comments,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: error.code || error.message,
        });
    }
};