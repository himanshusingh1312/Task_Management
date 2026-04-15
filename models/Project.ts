import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProject extends Document {
  projectName: string;
  description: string;
  createdBy: Types.ObjectId;
}

const ProjectSchema = new Schema<IProject>(
  {
    projectName: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Project =
  (mongoose.models.Project as mongoose.Model<IProject>) ||
  mongoose.model<IProject>("Project", ProjectSchema);

export default Project;
