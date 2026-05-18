import prisma from "../configs/prisma.js" 
import { inngest } from "../inngest/index.js";


// Create Task
export const createTask = async (req,res) => {
    try {
        const { userId } = await req.auth();
        const { projectId , title , description , type , status , priority , assigneeId , due_date} = req.body;
        const origin = req.get('orgin')
        
        // Check if user has admin role for project
        const project = await prisma.project.findUnique({
            where:{id: projectId},
            include: {members: {include: {user:true}}}
        })

        if (!project) {
            return res.status(404).json({ message: "Project not found "});
        }

        else if (project.team_lead !== userId) {
            return es.status(404).json({ message: "You dont have admin privileges for this project "});
        }
        else if (assigneeId && !project.members.find((members) => members.userId === assigneeId)) {
            return es.status(404).json({ message: "assignee is not a member of the project / workspace "});
        }
        
        const task = await  prisma.task.create({
            data:{
                projectId,
                title,
                description,
                priority,
                assigneeId,
                status,
                due_date: new Date(due_date)
            }
        })

        const taskWithAssignee = await prisma.task.findUnique({
            where:{id:task.id},
            include: {assignee:true}
        })

        await inngest.send({
            name:"app/task.assigned",
            data:{
                taskId: task.id, origin
            }
        })

        res.json({task: taskWithAssignee, message: "Task created Successfully"});
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message})   
    }
}


// Update Task
export const updateTask = async (req,res) => {
    try {
        const task = await prisma.task.findUnique({
            where:{id: req.params.id}
        })

        if (!task) {
            return res.status(404).json({ message: "Task not found "});
        }
        const { userId } = await req.auth();
        
        // Check if user has admin role for project
        const project = await prisma.project.findUnique({
            where:{id: task.projectId},
            include: {members: {include: {user:true}}}
        })

        if (!project) {
            return res.status(404).json({ message: "Project not found "});
        }

        else if (project.team_lead !== userId) {
            return es.status(404).json({ message: "You dont have admin privileges for this project "});
        }
        
        const updateTask = await prisma.task.update({
            where: {id: req.params.id},
            data: req.body
        })

        res.json({task: taskWithAssignee, message: "Task Updated  Successfully"});
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message})   
    }
}

// Delete Task
export const deleteTask = async (req,res) => {
    try {
    
        const { userId } = await req.auth();
        const { taskIds} = req.body
        const tasks = await prisma.task.findUnique({
            where:{id: taskIds}
        })

        if (tasks.length === 0) {
            return res.status(404).json({ message: "Task not found "});
        }
        
        const project = await prisma.project.findUnique({
            where:{id: task[0].projectId},
            include: {members: {include: {user:true}}}
        })

        if (!project) {
            return res.status(404).json({ message: "Project not found "});
        }

        else if (project.team_lead !== userId) {
            return es.status(404).json({ message: "You dont have admin privileges for this project "});
        }
        
        await prisma.task.deleteMany({
            where:{id:{in: taskIds}}
        })

        res.json({task: taskWithAssignee, message: "Task Deleted Successfully"});
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message})   
    }
}