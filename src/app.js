import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// Routes defined 

import userRouter from './routes/user.routes.js'
import healthcheckRouter from "./routes/healthcheck.routes.js"
import teamRouter from './routes/team.routes.js'
import resourceRouter from './routes/resource.routes.js'
import postRouter from './routes/post.routes.js'

app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/teams", teamRouter)
app.use('/api/v1/resources', resourceRouter);
app.use('/api/v1/posts', postRouter);

export { app }