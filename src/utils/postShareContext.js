/** Картка репосту в стрічці (не плутати з isRepostedByMe на вихідному пості). */
export function isRepostCard(post) {
  return Boolean(post?.originalPostId && post?.originalPost);
}

export function postAuthorDisplayName(author) {
  if (!author) return "Користувач";
  const full = [author.firstName, author.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (author.username) return author.username;
  return "Користувач";
}

/** Поділився / поділилася — евристика за закінченням імені (variant B). */
export function sharedPastTense(author) {
  const first = String(author?.firstName ?? "").trim().toLowerCase();
  if (!first) return "поділився";
  if (/[аяіяє]$/.test(first)) return "поділилася";
  return "поділився";
}
