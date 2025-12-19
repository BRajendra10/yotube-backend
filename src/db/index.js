import mongoose from 'mongoose'

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/ ${process.env.DB_NAME}`)
        console.log(`/n MongoDB connection !! DB HOST: ${connectionInstance}`);
    } catch (error) {
        console.log("MONGODB connection error", error);
        process.exit()
    }
}

export default connectDB