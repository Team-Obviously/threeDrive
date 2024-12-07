import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL;

const axiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 5000,
});

axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem("userId");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    return Promise.reject(error);
  },
);

export default axiosInstance;
