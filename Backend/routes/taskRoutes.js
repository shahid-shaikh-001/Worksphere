import express from "express"
import { createTask, updateTask, deleteTask } from "../controller/taskController.js";

const taskRouter = express.Router();

taskRouter.post('/',createTask)
taskRouter.put('/:id',updateTask)
taskRouter.post('/:delele',deleteTask)


export default taskRouter