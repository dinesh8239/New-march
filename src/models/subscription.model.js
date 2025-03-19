import mongoose, { schema } from "mongoose"

const subscriptionSchema = new schema({

    subscriber: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }


}, { timestamps: true })


export const Scubscription = mongoose.model("Subscription", subscriptionSchema)