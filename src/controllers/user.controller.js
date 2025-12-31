import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asynHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponce.js';
import { deleteOnImageKit, uploadOnImageKit } from '../utils/imagekit.js';
import { transporter } from '../utils/nodemailer.js';
import jwt from 'jsonwebtoken';
import mongoose, { isValidObjectId } from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const accessTokenOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 1000 * 60 * 15
};

const refreshTokenOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 1000 * 60 * 60 * 24 * 15
}

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
        avatar = await uploadOnImageKit(avatarLocalPath);
        coverImage = await uploadOnImageKit(coverImageLocalPath);
    } catch (error) {
        throw new ApiError(500, "Image upload failed");
    }

    if (!avatar?.url) throw new ApiError(500, "Avatar upload failed");
    if (!coverImage?.url) throw new ApiError(500, "Cover image upload failed");

    const code = crypto.randomInt(100000, 1000000).toString();
    const hashedCode = await bcrypt.hash(code, 10);

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        avatarFileId: avatar.fileId,
        coverImage: coverImage.url,
        coverImageFileId: coverImage.fileId,
        email,
        password,
        username: username.toLowerCase(),
        isEmailVerified: false,
        emailVerificationCode: hashedCode,
        emailVerificationExpires: Date.now() + 10 * 60 * 1000,
    });

    await transporter.sendMail({
        to: email,
        subject: "Your verification code",
        html: `<h2>${code}</h2><p>Expires in 10 minutes</p>`,
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Failed to create user", false);
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
});

const verifyEmail = asyncHandler(async (req, res) => {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) throw new ApiError(400, "User not found");

    if (user.emailVerificationExpires < Date.now()) {
        throw new ApiError(400, "Code expired");
    }

    const isMatch = await bcrypt.compare(code.toString(), user.emailVerificationCode);
    if (!isMatch) throw new ApiError(400, "Invalid code");

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.isEmailVerified = true;
    user.refreshToken = refreshToken;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res
        .status(201)
        .cookie("accessToken", accessToken, accessTokenOptions)
        .cookie("refreshToken", refreshToken, refreshTokenOptions)
        .json(
            new ApiResponse(201, {}, "User email verification completed")
        )
})

const resendVerificationCode = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await User.findOne({ email });
    console.log(user)
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    console.log("Checking if email is already verifyed or not")

    if (user.isEmailVerified) {
        throw new ApiError(400, "Email is already verified");
    }

    console.log("Email is nto verifiied !!")

    const code = crypto.randomInt(100000, 1000000).toString();
    const hashedCode = await bcrypt.hash(code, 10);

    console.log(code, hashedCode)

    user.emailVerificationCode = hashedCode;
    user.emailVerificationExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    await transporter.sendMail({
        to: user.email,
        subject: "Your verification code",
        html: `<h2>${code}</h2><p>Expires in 10 minutes</p>`,
    });

    return res.status(200).json(
        new ApiResponse(200, {}, "New verification code sent successfully")
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

    if (!user.isEmailVerified) {
        throw new ApiError(403, "Please verify your email first");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    return res
        .status(200)
        .cookie("accessToken", accessToken, accessTokenOptions)
        .cookie("refreshToken", refreshToken, refreshTokenOptions)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "Login successful"));
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: { refreshToken: undefined }
    }, { new: true });

    return res
        .status(200)
        .clearCookie("accessToken", accessTokenOptions)
        .clearCookie("refreshToken", refreshTokenOptions)
        .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    let incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

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

    if (!user || user.refreshToken !== incomingRefreshToken) {
        throw new ApiError(401, "Refresh token reused or expired");
    }

    const accessToken = await user.generateAccessToken();

    return res
        .status(200)
        .cookie("accessToken", accessToken, accessTokenOptions)
        .json(new ApiResponse(200, { accessToken }, "Token refreshed"));
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
            if (user.avatarFileId) await deleteOnImageKit(user.avatarFileId);

            const avatar = await uploadOnImageKit(avatarFilePath);
            if (!avatar?.url) throw new ApiError(500, "Avatar upload failed", false);

            updateData.avatar = avatar.url;
            updateData.avatarFileId = avatar.fileId;
        }

        if (coverImageFilePath) {
            if (user.coverImageFileId) await deleteOnImageKit(user.coverImageFileId);

            const coverImage = await uploadOnImageKit(coverImageFilePath);
            if (!coverImage?.url) throw new ApiError(500, "Cover image upload failed");

            updateData.coverImage = coverImage.url;
            updateData.coverImageFileId = coverImage.fileId;
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
    updateUserProfile,
    getUserChannelProfile,
    addVideoToWatchHistory,
    verifyEmail,
    resendVerificationCode
};
