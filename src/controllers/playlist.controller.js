import mongoose, { isValidObjectId } from 'mongoose';
import { Playlist } from '../models/playlist.model.js';
import { asyncHandler } from '../utils/asynHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponce.js';

const createPlaylist = asyncHandler(async (req, res) => {
    const { description, name, videoId } = req.body;

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "video id is required and should be valid");
    }

    if (!name || !description) {
        throw new ApiError(400, "name and description fields are required");
    }

    const createdPlaylist = await Playlist.create({
        name,
        description,
        owner: req.user?._id,
        videos: [videoId],
    });

    if (!createdPlaylist) {
        throw new ApiError(500, "Something went wrong while creating playlist", false);
    }

    return res
        .status(201)
        .json(new ApiResponse(201, createdPlaylist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "user id is required and should be valid");
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            },
        },
        {
            $addFields: {
                thumbnail: { $arrayElemAt: ["$videos.thumbnail", 0] },
            },
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "User playlists fetched successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "playlist id is required and should be valid");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner"
                        }
                    },
                    {
                        $unwind: "$owner"
                    }
                ]
            }
        },
        {
            $addFields: {
                thumbnail: { $arrayElemAt: ["$videos.thumbnail", 0] },
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                thumbnail: 1,
                type: 1,
                videos: {
                    _id: 1,
                    videoFile: 1,
                    videoPublicId: 1,
                    thumbnail: 1,
                    thumbnailPublicId: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    owner: {
                        _id: 1,
                        fullName: 1,
                        username: 1,
                        avatar: 1
                    }
                }
            }
        }
    ])

    if (!playlist) {
        throw new ApiError(400, "Playlist does not exist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist[0], "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "playlist id is required and should be valid");
    }

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "video id is required and should be valid");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $addToSet: { videos: videoId } },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to update playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "playlist id is required and should be valid");
    }

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "video id is required and should be valid");
    }

    await Playlist.findByIdAndUpdate(
        playlistId,
        { $pull: { videos: videoId } },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video removed successfully"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "playlist id is required and should be valid");
    }

    await Playlist.findByIdAndDelete(playlistId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "playlist id is required and should be valid");
    }

    if (!name || !description) {
        throw new ApiError(400, "name and description fields are required");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $set: { name, description } },
        { new: true, runValidators: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "Something went wrong while updating playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"));
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
};