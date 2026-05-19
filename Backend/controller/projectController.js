import prisma from "../configs/prisma.js";

// Create Project
export const createproject = async (req, res) => {
    try {
        const userId = req.userId;

        const {
            workspaceId,
            description,
            name,
            status,
            start_date,
            end_date,
            team_members,
            team_lead,
            progress,
            priority,
        } = req.body;

        // Check workspace
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                members: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!workspace) {
            return res.status(404).json({
                message: "Workspace not found",
            });
        }

        // Check admin permission
        const isAdmin = workspace.members.some(
            (member) =>
                member.userId === userId &&
                member.role === "ADMIN"
        );

        if (!isAdmin) {
            return res.status(403).json({
                message:
                    "You don't have permission to create projects in this workspace",
            });
        }

        // Find team lead
        const teamLead = team_lead
            ? await prisma.user.findUnique({
                  where: {
                      email: team_lead,
                  },
                  select: {
                      id: true,
                  },
              })
            : null;

        // Create project
        const project = await prisma.project.create({
            data: {
                workspaceId,
                name,
                description,
                status,
                priority,
                progress: progress || 0,
                team_lead: teamLead?.id || userId,
                start_date: start_date
                    ? new Date(start_date)
                    : null,
                end_date: end_date
                    ? new Date(end_date)
                    : null,
            },
        });

        // Add project members
        const memberToAdd = new Set();

        memberToAdd.add(userId);

        if (teamLead?.id) {
            memberToAdd.add(teamLead.id);
        }

        if (team_members?.length > 0) {
            workspace.members.forEach((member) => {
                if (
                    team_members.includes(
                        member.user.email
                    )
                ) {
                    memberToAdd.add(member.user.id);
                }
            });
        }

        if (memberToAdd.size > 0) {
            await prisma.projectMember.createMany({
                data: Array.from(memberToAdd).map(
                    (memberId) => ({
                        projectId: project.id,
                        userId: memberId,
                    })
                ),
                skipDuplicates: true,
            });
        }

        // Fetch full project
        const projectWithMembers =
            await prisma.project.findUnique({
                where: {
                    id: project.id,
                },
                include: {
                    members: {
                        include: {
                            user: true,
                        },
                    },
                    tasks: {
                        include: {
                            assignee: true,
                            comments: {
                                include: {
                                    user: true,
                                },
                            },
                        },
                    },
                    owner: true,
                    workspace: true,
                },
            });

        return res.json({
            project: projectWithMembers,
            message:
                "Project created successfully",
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message:
                error.code || error.message,
        });
    }
};

// Update Project
export const updateProject = async (
    req,
    res
) => {
    try {
        const userId = req.userId;

        const { id } = req.params;

        const {
            workspaceId,
            description,
            name,
            status,
            start_date,
            end_date,
            team_lead,
            progress,
            priority,
        } = req.body;

        const existingProject =
            await prisma.project.findUnique({
                where: { id },
            });

        if (!existingProject) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        const workspace =
            await prisma.workspace.findUnique({
                where: {
                    id: workspaceId,
                },
                include: {
                    members: true,
                },
            });

        const isAdmin =
            workspace.members.some(
                (member) =>
                    member.userId === userId &&
                    member.role === "ADMIN"
            );

        const isLead =
            existingProject.team_lead ===
            userId;

        if (!isAdmin && !isLead) {
            return res.status(403).json({
                message:
                    "You don't have permission to update this project",
            });
        }

        const teamLead = team_lead
            ? await prisma.user.findUnique({
                  where: {
                      email: team_lead,
                  },
                  select: {
                      id: true,
                  },
              })
            : null;

        const updatedProject =
            await prisma.project.update({
                where: { id },

                data: {
                    workspaceId,
                    description,
                    name,
                    status,
                    priority,
                    progress:
                        progress ??
                        existingProject.progress,

                    team_lead:
                        teamLead?.id ||
                        existingProject.team_lead,

                    start_date: start_date
                        ? new Date(start_date)
                        : existingProject.start_date,

                    end_date: end_date
                        ? new Date(end_date)
                        : existingProject.end_date,
                },

                include: {
                    members: {
                        include: {
                            user: true,
                        },
                    },

                    tasks: {
                        include: {
                            assignee: true,
                            comments: {
                                include: {
                                    user: true,
                                },
                            },
                        },
                    },

                    owner: true,
                    workspace: true,
                },
            });

        return res.json({
            project: updatedProject,
            message:
                "Project updated successfully",
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message:
                error.code || error.message,
        });
    }
};

// Add Member
export const addMember = async (
    req,
    res
) => {
    try {
        const userId = req.userId;

        const { projectId } = req.params;

        const { email } = req.body;

        const project =
            await prisma.project.findUnique({
                where: {
                    id: projectId,
                },

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

        if (
            project.team_lead !== userId
        ) {
            return res.status(403).json({
                message:
                    "Only project lead can add members",
            });
        }

        const existingMember =
            project.members.find(
                (member) =>
                    member.user.email ===
                    email
            );

        if (existingMember) {
            return res.status(400).json({
                message:
                    "User already exists in project",
            });
        }

        const user =
            await prisma.user.findUnique({
                where: {
                    email,
                },
            });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        const member =
            await prisma.projectMember.create(
                {
                    data: {
                        userId: user.id,
                        projectId,
                    },

                    include: {
                        user: true,
                    },
                }
            );

        return res.json({
            member,
            message:
                "Member added successfully",
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message:
                error.code || error.message,
        });
    }
};