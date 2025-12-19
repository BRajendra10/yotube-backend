import dotenv from 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './db/index.js';
import { app } from './app.js';

connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("Error:", error);
            throw error
        })

        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is runnning at PORT, ${process.env.PORT}`)
        })
    })
    .catch((err) => {
        console.log("MONGO db connection failed !! ", err);
    })


