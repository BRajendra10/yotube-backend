import mongoose, { isValidObjectId } from 'mongoose'
import { asyncHandler } from '../utils/asynHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponce.js';
import { uploadOnImageKit, deleteOnImageKit } from '../utils/imagekit.js'
import { Video } from '../models/video.model.js';
import { Like } from '../models/like.model.js';
import { getVideoDuration } from '../utils/duration.js';

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "desc", userId } = req.query;

    if (isNaN(page) || page < 1) {
        throw new ApiError(400, "Invalid 'page' value. It must be a positive number.");
    }

    if (isNaN(limit) || limit < 1 || limit > 50) {
        throw new ApiError(400, "Invalid 'limit' value. It must be between 1 and 50.");
    }

    if (!["asc", "desc"].includes(sortType)) {
        throw new ApiError(400, "Invalid 'sortType' value. Use 'asc' or 'desc'.");
    }

    // Clean empty string validations
    if (!sortBy || sortBy == "") {
        throw new ApiError(400, "Query and sortBy cannot be empty.");
    }

    if (userId && userId.trim() !== "" && !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId.");
    }

    const matchStage = {
        $match: {
            $and: [
                {
                    $or: [
                        { title: { $regex: query, $options: "i" } },
                        { description: { $regex: query, $options: "i" } }
                    ]
                }
            ]
        }
    };

    if (userId) {
        matchStage.$match.$and.push({ owner: new mongoose.Types.ObjectId(userId) });
    }

    const aggregationPipeline = [
        matchStage,

        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        { $unwind: "$owner" },

        {
            $sort: {
                [sortBy]: sortType === "desc" ? -1 : 1
            }
        },

        {
            $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                videoFile: 1,
                duration: 1,
                createdAt: 1,
                owner: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1
                }
            }
        }
    ];

    const options = {
        page: Number(page),
        limit: Number(limit)
    };

    const result = await Video.aggregatePaginate(
        Video.aggregate(aggregationPipeline),
        options
    );

    if (!result) {
        throw new ApiError(404, "No videos found.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Videos data fetched successfully"));
});

const publishVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if ([title, description].some(field => !field?.trim())) {
        throw new ApiError(400, "All fields are required");
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoFileLocalPath) throw new ApiError(400, "Video file is required");
    if (!thumbnailLocalPath) throw new ApiError(400, "Thumbnail is required");

    const duration = await getVideoDuration(videoFileLocalPath);
    const videoFile = await uploadOnImageKit(videoFileLocalPath);
    const thumbnail = await uploadOnImageKit(thumbnailLocalPath);

    if (!videoFile?.url || !thumbnail?.url) {
        throw new ApiError(500, "Error uploading files to Imagekit");
    }

    const videoData = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        videoFileId: videoFile.fileId,
        thumbnail: thumbnail.url,
        thumbnailFileId: thumbnail.fileId,
        owner: req.user._id,
        duration,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, videoData, "Video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "video id is required and should be valid !!");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
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
        },
        {
            $lookup: {
                from: "subscribers",
                localField: "owner._id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                isLiked: userId 
                    ? { $in: [userId, "$likes.likedBy"] } 
                    : false,
                "owner.isSubscribed": userId
                    ? { $in: [userId, "$subscribers.subscriber"] }
                    : false
            }
        },
        {
            $project: {
                videoFile: 1,
                videoFileId: 1,
                thumbnail: 1,
                thumbnailFileId: 1,
                title: 1,
                description: 1,
                duration: 1,
                likesCount: 1,
                isLiked: 1,
                views: 1,
                isPublished: 1,
                owner: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                    isSubscribed: 1,
                }
            }
        }
    ])

    if (!video.length) {
        throw new ApiError(404, "Video does not exist !!");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

const updateVideoDetails = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Valid video ID is required");
    }

    if ([title, description].some(field => !field?.trim())) {
        throw new ApiError(400, "Title and description are required", true);
    }

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found", true);

    const videoFilePath = req.files?.videoFile?.[0]?.path;
    const thumbnailPath = req.files?.thumbnail?.[0]?.path;

    if (videoFilePath) {
        if (video.videoFileId) await deleteOnImageKit(video.videoFileId);

        const duration = await getVideoDuration(videoFilePath);
        const uploadedVideo = await uploadOnImageKit(videoFilePath);
        if (!uploadedVideo?.url) throw new ApiError(500, "Error uploading new video");

        video.videoFile = uploadedVideo.url;
        video.videoFileId = uploadedVideo.fileId;
        video.duration = duration;
    }

    if (thumbnailPath) {
        if (video.thumbnailFileId) await deleteOnImageKit(video.thumbnailFileId);

        const uploadedThumbnail = await uploadOnImageKit(thumbnailPath);
        if (!uploadedThumbnail?.url) throw new ApiError(500, "Error uploading new thumbnail");

        video.thumbnail = uploadedThumbnail.url;
        video.thumbnailFileId = uploadedThumbnail.fileId;
    }

    video.title = title;
    video.description = description;

    await video.save();

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video details updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Valid video ID is required", true);
    }

    const video = await Video.findById(videoId);

    if (!video) throw new ApiError(404, "Video not found", true);

    if (video.videoFileId) await deleteOnImageKit(video.videoFileId);
    if (video.thumbnailFileId) await deleteOnImageKit(video.thumbnailFileId);

    await Video.findByIdAndDelete(videoId);

    return res
        .status(200)
        .json(new ApiResponse(200, { videoId }, "Video deleted successfully"));
});

export {
    getAllVideos,
    publishVideo,
    deleteVideo,
    updateVideoDetails,
    getVideoById
};
