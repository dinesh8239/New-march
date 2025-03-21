import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { validateSchemaUpdatae } from "../utils/validation.js"
import fs from 'fs';
import mongoose from "mongoose"
import { pipeline } from "stream"

export const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

export const registerUser = asyncHandler(async (req, res) => {
    try {
        validateSchemaUpdatae(req);
        const { fullName, email, username, password } = req.body;
        // console.log("email", email);

        if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
            throw new ApiError(400, "All fields are required");
        }

        const existedUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existedUser) {
            throw new ApiError(409, "User with email or username already exists");
        }

        const avatarLocalPath = req.files?.avatar[0]?.path;
        // const coverImageLocalPath = req.files?.coverImage[0]?.path;


        let coverImageLocalPath;
        if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
            coverImageLocalPath = req.files.coverImage[0].path;
        }

        // console.log("Avatar path: ", avatarLocalPath);  // Log the avatar file path

        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is required");
        }

        if (!fs.existsSync(avatarLocalPath)) {
            console.error("Avatar file does not exist at:", avatarLocalPath);
            throw new ApiError(400, "Avatar file is missing or failed to upload.");
        }

        // Now let's upload it to Cloudinary
        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;


        if (!avatar) {
            throw new ApiError(400, "Failed to upload avatar to Cloudinary");
        }

        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase(),
        });

        const createdUser = await User.findById(user._id).select("-password -refreshToken");

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the user");
        }

        return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));
    } catch (error) {
        throw new ApiError(401, error?.message || "something went wrong")
    }
});

export const loginUser = asyncHandler(async (req, res) => {
    try {
        const { email, password, username } = req.body

        // if(!email && !username) {
        //     throw new ApiError(400, "email or username is requried")
        // }

        if (!(email || username)) {
            throw new ApiError(400, "email or username is required"
            )
        }

        const user = await User.findOne({
            $or: [{ email }, { username }]
        })

        if (!user) {
            throw new ApiError(404, "user does not exist"
            )
        }

        const isPasswordValid = await user.isPasswordCorrect(password)

        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid user credentials")
        }

        const { accessToken, refreshToken } = await
            generateAccessAndRefreshTokens(user._id)

        const loggedInUser = await User.findById(user._id).
            select("-password -refreshToken")

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(200, {

                    user: loggedInUser, accessToken, refreshToken
                },
                    "User logged In Successfully"
                )
            )

    } catch (error) {
        throw new ApiError(401, error?.message || "something went wrong")
    }
})

export const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))


})

export const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.
        refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const options = {
            httpOnly: true,
            server: true
        }

        const { accessToken, newRefreshToken } = await
            generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message ||
            "something went wrong")
    }
})

export const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.
        isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }


    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))

})

export const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "current user fetched successfully")
})

export const updateAccountDetails = asyncHandler(async (req, res) => {

    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account updated successfully"))
})

export const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")

    }

    const avatar = await uploadOnCloudinary
        (avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200,
            'user avatar updated successfully'))

})

export const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "coverImage file is missing")

    }

    const coverImage = await uploadOnCloudinary
        (coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200,
            "user coverImage updated successfully"))

})

export const getUserChannelProfile = asyncHandler(async (reqx, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },

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
                as: "subscribersTo"

            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"

                },
                channelsSubscribedToCount: {
                    $size: "$subscribersTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                email: 1

            }


        }


    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "channel profile fetched successfully"))

})

export const getwatchHistory = asyncHandler(async (req, res) => {
    const user = await user.aggregate([
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
        .json(new ApiResponse(200, user[0].watchHistory,
            "Watch history fetched successfully"
        ))
})



// export {
//     refreshAccessToken,
//     registerUser,
//     loginUser,
//     logoutUser,
//     changeCurrentPassword,
//     updateAccountDetails,
//     getCurrentUser,
//     updateUserAvatar,
//     updateUserCoverImage,
//     getUserChannelProfile,
//     getwatchHistory
// };
