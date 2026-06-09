/** Картка репосту в стрічці (не плутати з isRepostedByMe на вихідному пості). */
export function isRepostCard(post) {
  return Boolean(post?.originalPostId && post?.originalPost);
}

import { i18n } from '../i18n';

export function postAuthorDisplayName(author, t = i18n.t.bind(i18n)) {
  if (!author) return t('common.user');
  const full = [author.firstName, author.lastName].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (author.username) return author.username;
  return t('common.user');
}

/** Евристика за закінченням імені (variant B repost label). */
export function isAuthorNameFeminine(author) {
  const first = String(author?.firstName ?? '').trim().toLowerCase();
  if (!first) return false;
  return /[аяіяє]$/.test(first);
}
