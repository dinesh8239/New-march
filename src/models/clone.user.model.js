// import mongoose, { Schema } from 'mongoose';

// const cloneUserSchema = new Schema({

//     firstName: {
//         type: String,
//         required: true,
//         miLength: 5,
//         maxLength: 20,
//         index: true

//     },
//     lastName: {
//         type: String,
//         required: true
//     },
//     email: {
//         type: String,
//         requireed: true,
//         unique: true,
//         index: true
//     },
//     password: {
//         type: String,
//         required: true,

//     },
//     photoUrl: {
//         type: String,
//         default: "https://picsum.photos/200/300"
//     }

// }, { timestamps: true })

// export const CloneUser = mongoose.model('CloneUser', cloneUserSchema)