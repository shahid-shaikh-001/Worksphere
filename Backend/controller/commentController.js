import express from "express"
import prisma from "../configs/prisma.js"


// Add comment
export const addComment = async (req,res) => {
    try {
        const { userId } = await req.auth()
        const { content , taskId } = req.body

        // check if user is projectmember
        const task = await prisma.task.findUnique({
            where:{id:{taskId}},
        })

        const project = await prisma.project.findUnique({
            where:{id: task.projectId},
            include: {members: {include: {user:true}}}
        })

        if (!project) {
            return res.status(404).json({ message: "Project not Found"})
        }

        const member = project.members.find((member) => member.userId === userId);

        if (!member) {
            return res.status(404).json({ message: "You are not member of this project"})
        }

        const comment = await prisma.comment.create({
            data:{taskId,comment,userId},
            include:{user:true}
        })

        res.json({comment})

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}


// Get comment on task
export const getTaskComment = async (req,res) => {
    try {
        const { taskId } =  req.params
        const comments = await prisma.comment.findUnique({
            where:{taskId},
            include:{user:true},
        })

         res.json({comments})
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}
