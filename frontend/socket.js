"use client";

import { io } from "socket.io-client";


// Connect to the backend server URL
const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL
export const socket = io(`http://${NEXT_PUBLIC_API_URL}:3001`);