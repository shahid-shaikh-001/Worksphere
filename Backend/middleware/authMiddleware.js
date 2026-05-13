import { getAuth } from "@clerk/express";

export const protect = async (req, res, next) => {
    try {
        const { userId } = await req.auth();

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        req.userId = userId;
        next();

    } catch (error) {
        console.log(error);
        res.status(401).json({ message: error.message });
    }
}