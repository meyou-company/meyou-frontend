import { api } from "./api";

export const usersApi = {
  search(params) {
    return api.get("/users/search", { params }); 
  },
};
