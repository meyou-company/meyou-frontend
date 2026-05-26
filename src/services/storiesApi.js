import { api as axios } from "./api";

// получить feed (главный экран сторис)
export const getStoriesFeed = () =>
  axios.get("/api/stories/feed").then((r) => r.data);

// создать story
export const createStory = (data) =>
  axios.post("/api/stories", data).then((r) => r.data);

// presigned url для загрузки медиа
export const getStoryUploadUrl = (fileName, fileType) =>
  axios
    .post("/api/uploads/story-media/presigned-url", {
      fileName,
      fileType,
    })
    .then((r) => r.data);

// отметить просмотр
export const viewStory = (id) =>
  axios.post(`/api/stories/${id}/view`).then((r) => r.data);

// удалить свою story
export const deleteStory = (id) =>
  axios.delete(`/api/stories/${id}`).then((r) => r.data);

// views список (для автора)
export const getStoryViews = (id) =>
  axios.get(`/api/stories/${id}/views`).then((r) => r.data);

// сторис конкретного пользователя
export const getUserStories = (username) =>
  axios.get(`/api/stories/${username}`).then((r) => r.data);