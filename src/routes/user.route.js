import { Router } from 'express';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/autho.middleware.js';
import {
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    getUserChannelProfile,
    getWatchHistory,
    loginUser,
    logoutUser,
    registerUser,
    updateUserProfile,
    addVideoToWatchHistory
} from '../controllers/user.controller.js';


const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        },
    ]),
    registerUser
)

router.route("/login").post(loginUser)

// secured Routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh_token").post(refreshAccessToken)
router.route("/change_password").post(verifyJWT, changeCurrentPassword)
router.route("/current_user").get(verifyJWT, getCurrentUser)
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
router.route("/history").get(verifyJWT, getWatchHistory)
router.route("/add-to-history/:videoId").post(verifyJWT, addVideoToWatchHistory)

router.route("/update-profile").patch(verifyJWT, upload.fields(
    [
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        },
    ]), 
    updateUserProfile
)


export default router