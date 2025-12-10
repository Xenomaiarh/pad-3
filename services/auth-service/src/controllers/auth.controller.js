const bcrypt = require("bcryptjs");
const prisma = require("../prisma/client");
const { registrationSchema } = require("../validation/registrationSchema");
const { checkRateLimit } = require("../utils/rateLimit");

module.exports.register = async (req, res) => {
    try {
        const clientIP =
            req.headers["x-forwarded-for"] ||
            req.headers["x-real-ip"] ||
            req.ip ||
            "unknown";

        const allowed = checkRateLimit(clientIP, 101, 15 * 60 * 1000);
        if (!allowed) {
            return res.status(429).json({
                message: "Too many registration attempts. Please try again later."
            });
        }

        const body = req.body;

        const parsed = registrationSchema.safeParse(body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation error",
                details: parsed.error.errors
            });
        }

        const { email, password } = parsed.data;

        const existingUser = await prisma.user.findFirst({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ message: "Email is already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 14);

        const { nanoid } = await import("nanoid");

        const newUser = await prisma.user.create({
            data: {
                id: nanoid(),
                email,
                password: hashedPassword,
                role: "user"
            }
        });

        return res.status(200).json({
            message: "User registered successfully",
            userId: newUser.id
        });
    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports.login = async (req, res) => {
    try {
        const clientIP =
            req.headers["x-forwarded-for"] ||
            req.headers["x-real-ip"] ||
            req.ip ||
            "unknown";

        const allowed = checkRateLimit(clientIP, 10, 15 * 60 * 1000);
        if (!allowed) {
            return res.status(429).json({
                message: "Too many login attempts. Please try again later."
            });
        }

        const { email, password } = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password are required" });
        }

        const user = await prisma.user.findFirst({
            where: { email }
        });

        if (!user || !user.password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        return res.status(200).json({
            id: user.id,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
