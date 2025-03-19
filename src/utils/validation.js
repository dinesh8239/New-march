import { ApiError } from "../utils/ApiError.js"
const validateSchemaUpdatae = (req) => {

    const { fullName, username, email, password } = req.body

    if (!fullName || !username) {
        throw new ApiError(400, "Name is required")

    }

    else if (!username || username.length < 5 || username.length > 15) {
        throw new ApiError(400, "Username must be between 5 and 15 characters")
    }

    else if (!fullName || fullName.length < 5 || fullName.length > 50) {
        throw new ApiError(400, "fullName must be between 5 and 50 characters")
    }

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(email)) {
        throw new ApiError(400, "Invalid email format")
    }

    else if (!password || password.length < 8) {
        throw new ApiError(400, "password must be at least 8 characters")
    }

}

export { validateSchemaUpdatae }

