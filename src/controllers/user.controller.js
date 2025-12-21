import { asyncHandler } from '../utils/asynHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponce.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary, deleteOnCloudinary } from '../utils/cloudinary.js';
import jwt from 'jsonwebtoken';
import mongoose, { isValidObjectId } from 'mongoose';

const options = { httpOnly: true, secure: false, sameSite: "lax" };

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { refreshToken, accessToken };

    } catch (error) {
        throw new ApiError(500, "Failed to generate tokens");
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;

    if ([fullName, email, username, password].some((f) => f?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");
    if (!coverImageLocalPath) throw new ApiError(400, "Cover image is required");

    let avatar, coverImage;

    try {
        avatar = await uploadOnCloudinary(avatarLocalPath);
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    } catch (error) {
        throw new ApiError(500, "Image upload failed");
    }

    if (!avatar?.secure_url) throw new ApiError(500, "Avatar upload failed");
    if (!coverImage?.secure_url) throw new ApiError(500, "Cover image upload failed");

    const user = await User.create({
        fullName,
        avatar: avatar.secure_url,
        avatarPublicId: avatar.public_id,
        coverImage: coverImage.secure_url,
        coverImagePublicId: coverImage.public_id,
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Failed to create user", false);
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({ $or: [{ username }, { email }] });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "Login successful"));
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: { refreshToken: undefined }
    }, { new: true });

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token missing");
    }

    let decoded;
    try {
        decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
        throw new ApiError(401, "Invalid refresh token");
    }

    const user = await User.findById(decoded?._id);

    if (!user) throw new ApiError(401, "Token user not found");
    if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "Refresh token expired or reused");
    }

    const { refreshToken: newRefreshToken, accessToken } =
        await generateAccessAndRefreshTokens(user._id);

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(200, { accessToken, newRefreshToken }, "Token refreshed"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old and new passwords are required");
    }

    const user = await User.findById(req.user._id);
    if (!user) throw new ApiError(404, "User not found");

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) throw new ApiError(401, "Old password incorrect");

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, {}, "Password updated"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User fetched"));
});

const updateUserProfile = asyncHandler(async (req, res) => {
    const { fullName } = req.body;

    if (!fullName || !String(fullName).trim()) {
        throw new ApiError(400, "Full name is required");
    }

    const avatarFilePath = req.files?.avatar?.[0]?.path;
    const coverImageFilePath = req.files?.coverImage?.[0]?.path;

    const user = await User.findById(req.user._id);
    if (!user) throw new ApiError(404, "User not found");

    const updateData = { fullName: String(fullName).trim() };

    try {
        if (avatarFilePath) {
            if (user.avatarPublicId) await deleteOnCloudinary(user.avatarPublicId);

            const avatar = await uploadOnCloudinary(avatarFilePath);
            if (!avatar?.secure_url) throw new ApiError(500, "Avatar upload failed", false);

            updateData.avatar = avatar.secure_url;
            updateData.avatarPublicId = avatar.public_id;
        }

        if (coverImageFilePath) {
            if (user.coverImagePublicId) await deleteOnCloudinary(user.coverImagePublicId);

            const coverImage = await uploadOnCloudinary(coverImageFilePath);
            if (!coverImage?.secure_url) throw new ApiError(500, "Cover image upload failed");

            updateData.coverImage = coverImage.secure_url;
            updateData.coverImagePublicId = coverImage.public_id;
        }
    } catch (error) {
        throw new ApiError(500, "Image processing failed", false, [], error.stack);
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, { $set: updateData }, { new: true })
        .select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, updatedUser, "Profile updated"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username || !username.trim()) throw new ApiError(400, "Username is required");

    const currentUserId = req.user ? new mongoose.Types.ObjectId(req.user._id) : null;

    const channel = await User.aggregate([
        { $match: { username: username.toLowerCase() } },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                channelsSubscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: currentUserId ? { $in: [currentUserId, "$subscribers.subscriber"] } : false
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                isSubscribed: 1,
                channelsSubscribedToCount: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);

    if (!channel || !channel.length) throw new ApiError(404, "Channel not found");

    return res.status(200).json(new ApiResponse(200, channel[0], "Channel fetched"));
});

const addVideoToWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id or missing video id !!");
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
            $addToSet: {
                watchHistory: videoId
            }
        },
        {
            new: true
        }
    );

    if (!updatedUser) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedUser.watchHistory,
            "Video added to watch history"
        )
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
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
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getWatchHistory,
    getCurrentUser,
    changeCurrentPassword,
    updateUserProfile,
    getUserChannelProfile,
    addVideoToWatchHistory
};
