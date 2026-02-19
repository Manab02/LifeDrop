import jwt from "jsonwebtoken";

const userAuth = async (req, res, next) => {
    const { token } = req.cookies;

    console.log(' Auth Check:', {
        hasCookie: !!token,
        path: req.path,
        method: req.method
    });

    if (!token) {
        return res.json({
            success: false,
            message: "Not Authorized. Login Again"
        });
    }

    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);

        console.log('Token decoded:', tokenDecode);

        if (tokenDecode.id) {
            if (!req.body) {
                req.body = {};
            }

            req.body.userId = tokenDecode.id;

            console.log('userId set:', req.body.userId);
            next();
        } else {
            return res.json({
                success: false,
                message: "Invalid token. Login Again"
            });
        }
    } catch (error) {
        console.error('Auth error:', error.message);
        res.json({
            success: false,
            message: error.message
        });
    }
}

export default userAuth;