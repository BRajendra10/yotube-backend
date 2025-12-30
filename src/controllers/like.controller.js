import mongoose, { isValidObjectId } from 'mongoose';
import { Like } from '../models/like.model.js';
import { asyncHandler } from '../utils/asynHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponce.js';

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "video id is required and should be valid");
    }

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    });

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);

        return res
            .status(200)
            .json(new ApiResponse(200, {videoId, likeState: false}, "Video unliked"));
    }

    const createdLike = await Like.create({
        video: videoId,
        likedBy: req.user?._id
    });

    if (!createdLike) {
        throw new ApiError(500, "Something went wrong while creating like instance");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {videoId, likeState: true}, "Video liked"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Comment id is required and should be valid");
    }

    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    });

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);

        return res
            .status(200)
            .json(new ApiResponse(200, {commentId, likeState: false}, "Comment unliked"));
    }

    const createdLike = await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    });

    if (!createdLike) {
        throw new ApiError(500, "Something went wrong while creating like instance");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {commentId, likeState: true}, "Comment liked"));
});

const togglePostLike = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    if (!postId || !isValidObjectId(postId)) {
        throw new ApiError(400, "Invalid id or missing post id");
    }

    const existingLikedPost = await Like.findOne({
        post: new mongoose.Types.ObjectId(postId),
        likedBy: req.user?._id
    });

    if (existingLikedPost) {
        await Like.findByIdAndDelete(existingLikedPost._id);

        return res
            .status(200)
            .json(new ApiResponse(200, {postId, likeState: false}, "Post unliked"));
    }

    const createLikedPost = await Like.create({
        post: new mongoose.Types.ObjectId(postId),
        likedBy: req.user?._id
    });

    if (!createLikedPost) {
        throw new ApiError(500, "Something went wrong while creating like instance for posts");
    }

    return res
        .status(200)
        .json(new ApiResponse(201, {postId, likeState: true}, "Post liked"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideoAggregate = await Like.aggregate([
        {
            $match: {
                likedBy: req.user?._id,
                video: { $exists: true, $ne: null }
            }
        },
        { $sort: { createdAt: -1 } },
        {
            $lookup: {
                from: 'videos',
                localField: 'video',
                foreignField: '_id',
                as: 'video',
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $unwind: "$owner"
                    }
                ]
            }
        },
        { $unwind: '$video' },
        {
            $project: {
                video: 1,
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, likedVideoAggregate, "Liked videos fetched successfully"));
});

const removeVideoFromLikedVideos = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id;

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Valid video id is required");
    }

    const deletedLike = await Like.findOneAndDelete({
        video: videoId,
        likedBy: userId,
    });

    if (!deletedLike) {
        throw new ApiError(404, "Like not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Removed video from liked videos"));
});


export {
    toggleCommentLike,
    togglePostLike,
    toggleVideoLike,
    getLikedVideos,
    removeVideoFromLikedVideos
};
