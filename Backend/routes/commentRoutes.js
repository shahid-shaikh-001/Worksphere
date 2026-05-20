import express from "express";
import { addComment, getTaskComment } from "../controller/commentController.js";

const commentRouter = express.Router();

commentRouter.post("/", addComment);
commentRouter.get("/:taskId", getTaskComment);

export default commentRouter;