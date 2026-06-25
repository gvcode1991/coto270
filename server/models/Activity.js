import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
    {
        usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },
        tipo: { type: String, required: true, trim: true, maxlength: 80, index: true },
        detalle: { type: String, default: "", trim: true, maxlength: 500 },
        ip: { type: String, default: "", maxlength: 80 },
        userAgent: { type: String, default: "", maxlength: 500 }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

activitySchema.index({ createdAt: -1 });

export const Activity = mongoose.model("Activity", activitySchema);
