const { z } = require("zod");

const registrationSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});

module.exports = { registrationSchema };
