const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  nickname: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  image: {
    type: String,
    required: true,
  },
  posts: [
    {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Post",
    },
  ],
  likes: [
    {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Post",
    },
  ],
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Usder", userSchema);
