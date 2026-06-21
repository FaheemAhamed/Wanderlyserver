const jwt = require("jsonwebtoken");


//Protect Routes Middleware

const protect = async (req, res, next) => {
  try {
    let token;

    //Get Token
    

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    //Token Missing

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    //Verify Token

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    //Attach User To Request

    req.user = decoded;

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

module.exports = protect;