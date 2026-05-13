import prisma from "../configs/prisma.js";

export const getUserWorkspaces = async (req,res) => {
    try {
        const {userId} = await req.auth();
        const workspaces = await prisma.workspace.findMany({
            where:{
                members:{some:{userId: userId}}
            },
            include:{
                members:{include:{user:true}},
                projects:{
                    include:{
                        tasks:{include: {assignee:true,comments:{include:{user:true}}}},
                            members: {include:{user:true}}
                    }
                },
                owner:true
            }
        })
        res.json({workspaces})
        
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.code || error.message})
        
    }
}

// Add member to workspace
export const addMember = async (req,res) => {
    try {
        const {userId} = await req.auth()
        const {email,role,workspaceId,message} = req.body

        // Check if user exists
        const user = await prisma.user.findUnique({where:{email}})

        if (!user) {
            return res.status(404).json({message:"User not Found"})
        }

        if (!workspaceId || !role) {
            return res.status(404).json({message:"Missing required parameters"})
        }

        if (!["ADMIN","MEMBER"].includes(role)) {
            return res.status(400).json({message:"Invalid role"})
        }

        // Fetch workspace
        const workspace = await prisma.workspace.findUnique(
            {where: {id:workspaceId}, include:{members:true}}
        )

        if (!workspace) {
            return res.status(404).json({message:"Workspaace not found"})
        }

        // Check creator has admin role
        if (!workspace.members.find((member) => member.userId === userId &&  member.role === "ADMIN" )) {
            return res.status(401).json({message:"You do not have admin privileges"})
        }

        // Check if user is already a member
        const existingMember = workspace.members.find((member) => member.userId === user.id);

        if (existingMember) {
            return res.status(401).json({message:"User is already a member"})
        }

        const member = await prisma.workspaceMember.create({
            data:{
                userId:user.id,
                workspaceId,
                role,
                message
            }
        })

        res.json({member,message:"Member added successfully"})
    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.code || error.message})
    }
}


export const createWorkspace = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { name, description, image_url } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Workspace name is required" });
        }

        // Generate a unique slug from the name
        const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

        // Create workspace
        const workspace = await prisma.workspace.create({
            data: {
                id: crypto.randomUUID(),
                name,
                slug,
                description: description || '',
                image_url: image_url || '',
                ownerId: userId,
            },
            include: {
                members: { include: { user: true } },
                projects: true
            }
        });

        // Add creator as ADMIN member
        await prisma.workspaceMember.create({
            data: {
                userId,
                workspaceId: workspace.id,
                role: 'ADMIN'
            }
        });

        res.status(201).json({ workspace, message: "Workspace created successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
};