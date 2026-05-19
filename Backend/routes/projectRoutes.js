import express from "express"
import { createproject, updateProject } from "../controller/projectController.js"
import { addMember } from "../controller/workcontroller.js";


const projectRouter = express.Router();

projectRouter.post('/',createproject)
projectRouter.put('/:id',updateProject)
projectRouter.put('/:projectId/addMember',addMember)


export default projectRouter