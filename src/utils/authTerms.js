export function hasAcceptedTerms(user) {
  return Boolean(
    user?.acceptedTerms === true ||
    user?.accepted_terms === true ||
    user?.acceptedTermsAt ||
    user?.accepted_terms_at
  );
}
