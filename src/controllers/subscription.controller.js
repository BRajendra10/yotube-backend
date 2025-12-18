import { asyncHandler } from '../utils/asynHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponce.js';
import { Subscription } from '../models/subscription.model.js';
import mongoose, { isValidObjectId } from 'mongoose';

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!channelId || !isValidObjectId(channelId)) {
        throw new ApiError(400, "channel id is required and should be valid !!");
    }

    const userId = req.user._id;

    const existingSub = await Subscription.findOne({
        subscriber: userId,
        channel: channelId
    });

    let isSubscribed = false;

    if (existingSub) {
        await Subscription.findByIdAndDelete(existingSub._id ?? existingSub._id);
        isSubscribed = false;
    } else {
        await Subscription.create({
            subscriber: userId,
            channel: channelId
        });
        isSubscribed = true;
    }

    // Count latest subscribers
    const subscribersCount = await Subscription.countDocuments({
        channel: channelId
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            { isSubscribed, subscribersCount },
            isSubscribed
                ? "Channel subscribed successfully"
                : "Channel unsubscribed successfully"
        )
    );
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!channelId || !isValidObjectId(channelId)) {
        throw new ApiError(400, "channel id is required and should be valid !!");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails"
            }
        },
        {
            $unwind: "$subscriberDetails"
        },
        {
            $project: {
                _id: 0,
                subscriberId: "$subscriberDetails._id",
                username: "$subscriberDetails.username",
                email: "$subscriberDetails.email",
                avatar: "$subscriberDetails.avatar",
                subscribedAt: "$createdAt"
            }
        }
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(200, subscribers, "Subscribers fetched successfully")
        );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!subscriberId || !isValidObjectId(subscriberId)) {
        throw new ApiError(400, "subscriber id is required and should be valid !!");
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails"
            }
        },
        {
            $unwind: "$channelDetails"
        },
        {
            $project: {
                _id: 0,
                channelId: "$channelDetails._id",
                username: "$channelDetails.username",
                fullName: "$channelDetails.fullName",
                avatar: "$channelDetails.avatar",
                subscribedAt: "$createdAt"
            }
        }
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully")
        );
});

export { getUserChannelSubscribers, getSubscribedChannels, toggleSubscription };