import mongoose, { isValidObjectId } from 'mongoose'
import { Comment } from '../models/comment.model.js';
import { asyncHandler } from '../utils/asynHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponce.js';

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user?._id

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "video id is required and should be valid. !!");
    }

    if (!page || !limit) {
        throw new ApiError(400, "page and limit is required");
    }

    const allComments = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $sort: {
                createdAt: -1
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
        { $unwind: "$owner" },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                likeCount: { $size: "$likes" },
                isLiked: userId
                    ? { $in: [userId, "$likes.likedBy"] }
                    : false,
            }
        },
        {
            $project: {
                content: 1,
                likeCount: 1,
                isLiked: 1,
                createdAt: 1,
                updateAt: 1,
                owner: {
                    _id: "$owner._id",
                    username: "$owner.username",
                    fullname: "$owner.fullName",
                    avatar: "$owner.avatar"
                }
            }
        }
    ]);

    const options = {
        page,
        limit,
    };

    const result = await Comment.aggregatePaginate(allComments, options);

    return res
        .status(200)
        .json(
            new ApiResponse(200, result, "All comments for video fetched successfully")
        );
});

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { comment } = req.body

    if (!videoId || !isValidObjectId(videoId) || !comment) {
        throw new ApiError(400, "Video id and comment are required");
    }

    const createdComment = await Comment.create({
        content: comment,
        video: videoId,
        owner: req.user?._id
    });

    if (!createdComment) {
        throw new ApiError(500, "Something went wrong while creating comment");
    }

    const populatedComment = await Comment.findById(createdComment._id).populate("owner", "_id username fullName avatar")


    return res
        .status(201)
        .json(
            new ApiResponse(201, populatedComment, "Comment added successfully")
        );
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { comment } = req.body

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "comment id is required and should be valid");
    }

    if(!comment){
        throw new  ApiError(400, "Comment is required !!")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        new mongoose.Types.ObjectId(commentId),
        {
            $set: { content: comment }
        },
        { new: true }
    );

    if (!updatedComment) {
        throw new ApiError(500, "Something went wrong while updating comment");
    }

    const populatedComment = await Comment.findById(commentId).populate("owner", "_id fullName username avatar")

    return res
        .status(200)
        .json(
            new ApiResponse(200, populatedComment, "Comment updated successfully")
        );
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "comment Id is required and should be valid");
    }

    await Comment.findByIdAndDelete(new mongoose.Types.ObjectId(commentId));

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Comment deleted successfully")
        );
});

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}