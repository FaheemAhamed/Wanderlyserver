const express = require("express"); 

const protect = require("../middleware/auth.middleware");
const { registerUser,loginUser, googleLogin } = require("../controllers/auth.controller");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/

router.post("/register", registerUser);
router.post("/login", loginUser); 
router.post("/google", googleLogin);
router.get("/me", protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Protected route accessed",
    user: req.user,
  });
});

module.exports = router;