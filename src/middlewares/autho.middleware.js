import { asyncHandler } from '../utils/asynHandler.js'
import { ApiError } from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import jwt from 'jsonwebtoken'

export const verifyJWT = asyncHandler(async (req, res, next) => {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization) {
        token = req.headers.authorization.replace("Bearer ", "");
    }

    if (!token) {
        throw new ApiError(401, "Authentication required");
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
        throw new ApiError(401, "Access token expired or invalid");
    }

    const user = await User.findById(decoded._id)
        .select("-password -refreshToken");

    if (!user) {
        throw new ApiError(401, "User not found");
    }

    req.user = user;
    next();
});