import mongoose, { isValidObjectId } from 'mongoose'
import { asyncHandler } from '../utils/asynHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponce.js';
import { uploadOnCloudinary, deleteOnCloudinary } from '../utils/cloudinary.js'
import { Video } from '../models/video.model.js';
import { Like } from '../models/like.model.js';

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
                    fullname: 1,
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

    const videoFile = await uploadOnCloudinary(videoFileLocalPath, "video");
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath, "image");

    if (!videoFile?.secure_url || !thumbnail?.secure_url) {
        throw new ApiError(500, "Error uploading files to Cloudinary");
    }

    const videoData = await Video.create({
        title,
        description,
        videoFile: videoFile.secure_url,
        videoPublicId: videoFile.public_id,
        thumbnail: thumbnail.secure_url,
        thumbnailPublicId: thumbnail.public_id,
        owner: req.user._id,
        duration: videoFile.duration
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
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                isLiked: userId ? {
                    $in: [userId, "$likes.likedBy"]
                } : false
            }
        },
        {
            $project: {
                videoFile: 1,
                videoPublicId: 1,
                thumbnail: 1,
                thumbnailPublicId: 1,
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
                    avatar: 1
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
        if (video.videoPublicId) await deleteOnCloudinary(video.videoPublicId);

        const uploadedVideo = await uploadOnCloudinary(videoFilePath, "video");
        if (!uploadedVideo?.url) throw new ApiError(500, "Error uploading new video");

        video.videoFile = uploadedVideo.url;
        video.videoPublicId = uploadedVideo.public_id;
        video.duration = uploadedVideo.duration;
    }

    if (thumbnailPath) {
        if (video.thumbnailPublicId) await deleteOnCloudinary(video.thumbnailPublicId);

        const uploadedThumbnail = await uploadOnCloudinary(thumbnailPath, "image");
        if (!uploadedThumbnail?.url) throw new ApiError(500, "Error uploading new thumbnail");

        video.thumbnail = uploadedThumbnail.url;
        video.thumbnailPublicId = uploadedThumbnail.public_id;
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

    // Cloudinary deletion → external → server error → no TRUE flag
    if (video.videoPublicId) await deleteOnCloudinary(video.videoPublicId, "video");
    if (video.thumbnailPublicId) await deleteOnCloudinary(video.thumbnailPublicId, "image");

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
