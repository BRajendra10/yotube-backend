import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema(
    {
        name: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ["owned", "saved"],
            default: "owned"
        },
        videos: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
    },
    {
        timestamps: true
    }
)



export const Playlist = mongoose.model("Playlist", playlistSchema)