
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ok, AppError } from "../utils/http.js";

// A1 — Login
export async function login(req, res) {
  const { email, password } = req.body || {};

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Email and password are required"
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
  });

  if (!user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Invalid email or password"
    );
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Invalid email or password"
    );
  }

  if (!process.env.JWT_SECRET) {
    throw new AppError(
      500,
      "SERVER_ERROR",
      "JWT configuration is missing"
    );
  }

  const token = jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      employeeId: user.employeeId
        ? user.employeeId.toString()
        : null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  const safeUser = {
    _id: user._id,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId ?? null,
  };

  return ok(res, {
    token,
    user: safeUser,
  });
}

// A2 — Get current logged-in user
export async function getMe(req, res) {
  const user = await User.findById(req.user.userId);

  if (!user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "User no longer exists"
    );
  }

  return ok(res, {
    user: {
      _id: user._id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId ?? null,
    },
  });
}
