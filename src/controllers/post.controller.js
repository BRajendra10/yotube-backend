import mongoose, { isValidObjectId } from "mongoose"
import { Post } from '../models/post.model.js';
import { asyncHandler } from '../utils/asynHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponce.js';

const createPost = asyncHandler(async (req, res) => {
    const { content } = req.body

    if (!content) {
        throw new ApiError(400, "Post content is required");
    }

    const post = await Post.create({
        content,
        owner: req.user?._id
    })

    if (!post) {
        throw new ApiError(500, "Something went wrong while creating post");
    }

    const populatedPost = await Post.findById(post._id)
        .populate("owner", "_id username fullName avatar")

    return res
        .status(201)
        .json(
            new ApiResponse(201, populatedPost, "Post is created successfully")
        )
})

const getUserPosts = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user?._id;

    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id or missing user id");
    }

    const postPipeline = await Post.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
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
            },
        },
        { $unwind: "$owner" },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "likes"
            },
        },
        {
            $addFields: {
                likesCount: { $size: "$likes"},
                isLiked: currentUserId
                    ? { $in: [currentUserId, "$likes.likedBy"] }
                    : false,
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                likesCount: 1,
                isLiked: 1,
                owner: {
                    _id: "$owner._id",
                    username: "$owner.username",
                    fullName: "$owner.fullName",
                    avatar: "$owner.avatar"
                }
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(200, postPipeline, "Posts fetched successfully")
        )
})

const getAllPosts = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    const posts = await Post.aggregate([
        {
            $sort: { createdAt: -1 },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        { $unwind: "$owner" },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes"},
                isLiked: userId
                    ? { $in: [userId, "$likes.likedBy"] }
                    : false,
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                likesCount: 1,
                isLiked: 1,
                owner: {
                    _id: "$owner._id",
                    username: "$owner.username",
                    fullName: "$owner.fullName",
                    avatar: "$owner.avatar",
                },
            },
        },
    ]);

    return res.status(200).json(
        new ApiResponse(200, posts, "Feed posts fetched successfully")
    );
});

const updatePost = asyncHandler(async (req, res) => {
    const { postId } = req.params
    const { content } = req.body

    if (!postId || !isValidObjectId(postId)) {
        throw new ApiError(400, "Post id is required and should be valid");
    }

    if (!content) {
        throw new ApiError(400, "Content is required for updating");
    }

    const updatedPost = await Post.findByIdAndUpdate(
        new mongoose.Types.ObjectId(postId),
        {
            $set: { content }
        },
        { new: true }
    )

    if (!updatedPost) {
        throw new ApiError(404, "Post not found");
    }

    const populatedPost = await Post.findById(postId)
        .populate("owner", "_id username fullName avatar")

    return res
        .status(200)
        .json(
            new ApiResponse(200, populatedPost, "Post updated successfully")
        )
})

const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params

    if (!postId || !isValidObjectId(postId)) {
        throw new ApiError(400, "Post id is required and should be valid");
    }

    const deleted = await Post.findByIdAndDelete(new mongoose.Types.ObjectId(postId))

    if (!deleted) {
        throw new ApiError(404, "Post not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Post deleted successfully")
        )
})

export {
    createPost,
    getUserPosts,
    updatePost,
    deletePost,
    getAllPosts
}