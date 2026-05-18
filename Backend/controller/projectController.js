import express from "express";
import prisma from "../configs/prisma.js";

// Create Projects
export const createproject = async (res,req) => {
    try {
        const { userId } = await req.auth();
        const { workspaceId , description, name, status, start_date, end_date, team_members, team_lead, progess, priority} = req.body

        //check if user has admin role for workspace
        const workspace = await prisma.workspace.findUnique({
            where:{id: workspaceId},
            include: {members: {include: {user: true}}}
        })

        if (!workspace) {
            res.status(404).json({ message: "Workspace not found"})
        }

        if (!workspace.members.some((members)=> members.userId === userId && members.role === "ADMIN")) {
            return res.status(403).json({ message: "You dont have permission to create projects in this workspace "}) 
        }

        const teamLead = await prisma.user.findUnique({
            where:{email:team_lead},
            select: {id: true}
        })

        const project = await prisma.project.create({
            data:{
                workspaceId,
                name,
                description,
                status,
                priority,
                progress,
                team_lead: teamLead?.id,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            }
        })

        // Add members to project if they are in the workspace
        if (team_members?.length > 0) {
            const memberToAdd = [] 
            workspace.members.forEach(member => {
                if (team_members.includes(member.user.email)) {
                    memberToAdd.push(member.user.id)
                }
            }) 
            await prisma.projectMember.createMany({
                data: memberToAdd.map(memberId => ({
                    projectId: project.id,
                    userId: memberId
                }))
            })
        }

        const projectWithMembers = await prisma.project.findUnique({
            where: {id: project.id},
            include: {
                member: {includes: {user:true}},
                tasks: {include: {assignee: true, comments:{include:{user:true}}}},
                owner: true,
            }
        })

        res,json({project: projectWithMembers, message: "Project created successfully"})

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message })
        
    }
}

// Update Project

export const updateProject = async (res,req) => {
    try {
        const { userId } = await req.auth() 
        const { workspaceId , description, name, status, start_date, end_date, team_members, team_lead, progess, priority} = req.body

        //check if user has admin role for workspace
        const workspace = await prisma.workspace.findUnique({
            where:{id: workspaceId},
            include: {members: {include: {user: true}}}
        })

        if (!workspace) {
            res.status(404).json({ message: "Workspace not found"})
        }

        if (!workspace.members.some((members)=> members.userId === userId && members.role === "ADMIN")) {
            const project = await prisma.project.findUnique({
                where:{id},
            })

            if (!project) {
                return res.status(400).json({message: "Project not found" });
            }
            else if (project.team_lead !== userId) {
                return res.status(403).json({ message: "You  dont have permisson to update project in this workspace" });
            }
        }

        const project = await prisma.project.create({
            where:{id},
            data:{
                workspaceId,
                description,
                name,
                status,
                priority,
                progress,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            }
        })

        res.json({ project, message: "Project updated successfully"})

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message })
    }
}

// Add member to Project 
export const addMember = async (res,req) => {
    try {
        const { userId } = await req.auth();
        const { projectId } = req.params
        const { email } = req.body

        // Check if user is project lead
        const project = await prisma.project.findUnique({
            where:{id:projectId},
            include:{members:{include:{user:true}}}
        })

        if (!project) {
            return res.status(400).json({ message: "Only project lead can add members"})
        }

        // Check  if user is already a member 
        const existingMember = project.members.find((member) => member.email === email)

        if (!existingMember) {
            return res.status(400).json({ message: "User is already a member"})
        }

        const user = await prisma.user.findUnique({ where: {email}});

        if (!user) {
            return res.status(400).json({ message: "User not found"})
        }

        const member = await prisma.projectMember.create({
            data:{
                userId: user.id,
                projectId
            }
        })

        res.json({ member, message: "Member added successfully"})
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message })
    }
}
