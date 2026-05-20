import express from "express";
import "dotenv/config";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import workspaceRouter from "./routes/workspaceRoutes.js";
import { protect } from "./middleware/authMiddleware.js";
import projectRouter from "./routes/projectRoutes.js";
import taskRouter from "./routes/taskRoutes.js";
import commentRouter from "./routes/commentRoutes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://worksphere-sx6a.vercel.app",
  "https://worksphere-dusky.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.options("*", cors());

app.use(express.json());
app.use(clerkMiddleware());

app.get("/", (req, res) => res.send("server is Live!"));

app.use("/api/inngest", serve({ client: inngest, functions }));

app.use("/api/workspaces", protect, workspaceRouter);
app.use("/api/projects", protect, projectRouter);
app.use("/api/tasks", protect, taskRouter);
app.use("/api/comments", protect, commentRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server is Running on Port: ${PORT}`));