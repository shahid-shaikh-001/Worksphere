import express from "express"
import { addMember, getUserWorkspaces , createWorkspace} from "../controller/workcontroller.js"

const workspaceRouter = express.Router()

workspaceRouter.get('/',getUserWorkspaces)
workspaceRouter.post('/', createWorkspace)
workspaceRouter.post('/add-member',addMember)

export default workspaceRouter
