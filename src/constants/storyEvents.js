export const STORY_CREATED_EVENT = 'meyou:story.created';
export const STORY_DELETED_EVENT = 'meyou:story.deleted';
export const STORY_VIEWED_EVENT = 'meyou:story.viewed';
export const STORY_REACTED_EVENT = 'meyou:story.reacted';
export const STORY_REPLIED_EVENT = 'meyou:story.replied';

function dispatchStoryEvent(type, detail) {
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

export const dispatchStoryCreated = (detail) => dispatchStoryEvent(STORY_CREATED_EVENT, detail);
export const dispatchStoryDeleted = (detail) => dispatchStoryEvent(STORY_DELETED_EVENT, detail);
export const dispatchStoryViewed = (detail) => dispatchStoryEvent(STORY_VIEWED_EVENT, detail);
export const dispatchStoryReacted = (detail) => dispatchStoryEvent(STORY_REACTED_EVENT, detail);
export const dispatchStoryReplied = (detail) => dispatchStoryEvent(STORY_REPLIED_EVENT, detail);
