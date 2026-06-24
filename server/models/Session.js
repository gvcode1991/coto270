import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
    {
        usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        tokenHash: { type: String, required: true, unique: true },
        expira: { type: Date, required: true, index: { expires: 0 } }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

export const Session = mongoose.model("Session", sessionSchema);
