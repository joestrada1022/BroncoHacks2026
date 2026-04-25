"use client";

import { io } from "socket.io-client";

// Connect to the backend server URL
export const socket = io("http://localhost:3001");