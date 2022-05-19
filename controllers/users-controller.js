const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { uploadFile } = require("../s3");

const HttpError = require("../models/http-errors");
const User = require("../models/user");
const Post = require("../models/post");

const POSTS_PER_PAGE = 12;

const generateToken = (id, nickname, email) => {
    let token;
    try {
        token = jwt.sign(
            {
                id,
                nickname,
                email,
            },
            process.env.JWT_KEY,
            {
                expiresIn: "1h",
            }
        );
    } catch (err) {
        return next(HttpError("JWT sign failed.", 500));
    }
    return token;
};

const signup = async (req, res, next) => {
    const { nickname, email, password } = req.body;

    let existingUser;
    try {
        await User.find({ nickname });
    } catch (err) {
        return next(new HttpError("Signing up failed, please try again.", 500));
    }

    if (existingUser)
        return next(
            new HttpError("Signing up failed, nickname already in use", 422)
        );

    try {
        await User.find({ email });
    } catch (err) {
        return next(new HttpError("Signing up failed, please try again", 500));
    }

    if (existingUser)
        return next(
            new HttpError("Signing up failed, email already in use.", 422)
        );

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
        return next(
            new HttpError("Password hashing failed, please try again.", 500)
        );
    }

    const result = await uploadFile(req.file);

    const createdUser = new User({
        nickname,
        email,
        password: hashedPassword,
        posts: [],
        likes: [],
        image: req.file ? `/images/${result.Key}` : "/images/default.png",
    });

    try {
        await createdUser.save();
    } catch (err) {
        return next(new HttpError("Saving created user failed.", 500));
    }

    const token = generateToken(createdUser.id, nickname, email);

    res.json({
        nickname: createdUser.nickname,
        email: createdUser.email,
        token,
    });
};

const login = async (req, res, next) => {
    const { nickname, password } = req.body;

    let existingUser;
    try {
        existingUser = await User.findOne({ nickname });
    } catch (err) {
        return next(new HttpError("Finding user by nickname failed.", 500));
    }

    if (!existingUser) {
        return next(new HttpError("User not found.", 404));
    }

    try {
        const match = await bcrypt.compare(password, existingUser.password);
        if (!match) return next(new HttpError("Incorrect password.", 401));
    } catch (err) {
        return next(new HttpError("Password verification failed.", 500));
    }

    const token = generateToken(existingUser.id, nickname, existingUser.email);

    res.json({
        nickname: existingUser.nickname,
        email: existingUser.email,
        id: existingUser._id,
        likes: existingUser.likes,
        token,
    });
};

const getProfileData = async (req, res, next) => {
    const userId = req.params.uid;

    let userData;
    try {
        userData = await User.findById(userId);
    } catch (err) {
        return next(new HttpError("Fetching user data failed.", 500));
    }

    if (!userData) {
        return next(new HttpError("User doesn't exist.", 404));
    }

    res.json({
        profile: {
            image: userData.image,
            nickname: userData.nickname,
            likes: userData.likes,
            posts: userData.posts,
        },
    });
};

const getLikesByNickname = async (req, res, next) => {
    const nickname = req.params.uid;

    let { page, name, category } = req.query;

    let fetchedUser;
    try {
        fetchedUser = await User.findOne({ nickname });

        if (!fetchedUser)
            return next(new HttpError("User doesn't exist."), 404);
    } catch (err) {
        return next(new HttpError("Fetching user failed."), 500);
    }

    if (!page) {
        page = 1;
    }

    const findOptions = { _id: { $in: fetchedUser.likes } };
    if (name) {
        findOptions.title = {
            $regex: name,
            $options: "i",
        };
    }

    if (category) {
        findOptions.category = category;
    }

    totalItems = fetchedUser.likes.length;
    let fetchedPosts;
    try {
        fetchedPosts = await Post.find(findOptions)
            .sort({ date: -1 })
            .skip((page - 1) * POSTS_PER_PAGE)
            .limit(POSTS_PER_PAGE)
            .populate("creator", "nickname image")
            .select("title creator image");
    } catch (err) {
        return next(new HttpError("Fetching posts failed.", 500));
    }

    res.json({
        posts: fetchedPosts.map((post) => post.toObject({ getters: true })),
        totalPosts: totalItems,
        hasPreviousPage: page > 1,
        hasNextPage: POSTS_PER_PAGE * page < totalItems,
        previousPage: page - 1,
        nextPage: +page + 1,
        totalPages: Math.ceil(totalItems / POSTS_PER_PAGE),
        currentPage: +page,
    });
};

const getAccountData = async (req, res, next) => {
    const { id } = req.userData;

    let accountData;
    try {
        accountData = await User.findById(id).select("nickname email image");
    } catch (err) {
        return next(new HttpError("Fetching account data failed.", 500));
    }

    if (!accountData) return next(new HttpError("Account doesn't exist.", 404));

    res.json(accountData);
};

const editAccount = async (req, res, next) => {
    const { id } = req.userData;
    const { nickname, image, email } = req.body;

    let fetchedUser;
    try {
        fetchedUser = await User.findById(id);
    } catch (err) {
        return next(new HttpError("Fetching account failed.", 500));
    }

    if (!fetchedUser) return next(new HttpError("Account doesn't exist.", 404));

    const result = await uploadFile(req.file);

    if (nickname) fetchedUser.nickname = nickname;
    if (req.file) fetchedUser.image = `/images/${result.Key}`;
    if (email) fetchedUser.email = email;

    try {
        fetchedUser.save({
            validateModifiedOnly: true,
        });
    } catch (err) {
        return next(new HttpError("Saving account changes failed."));
    }

    res.json(fetchedUser);
};

exports.signup = signup;
exports.login = login;
exports.getProfileData = getProfileData;
exports.getLikesByNickname = getLikesByNickname;
exports.getAccountData = getAccountData;
exports.editAccount = editAccount;
