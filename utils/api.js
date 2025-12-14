import axios from 'axios';

// REPLACE with your actual computer's IP address if testing locally
const BASE_URL = 'https://mechanic-setu.onrender.com/api/';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;