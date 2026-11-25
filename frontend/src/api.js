import axios from "axios";

export const api = axios.create({ baseURL: "http://localhost:8081/api" });

// every request carries the admin JWT (if logged in)
api.interceptors.request.use((cfg) => {
  const tok = localStorage.getItem("tp_token");
  if (tok) cfg.headers.Authorization = "Bearer " + tok;
  return cfg;
});

// simple per-browser user id for commuters
let id = localStorage.getItem("tp_uid");
if (!id) {
  id = "u" + Math.random().toString(36).slice(2, 10);
  localStorage.setItem("tp_uid", id);
}
export const uid = id;
