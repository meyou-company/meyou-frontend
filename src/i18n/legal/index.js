import {
  LEGAL_DOCUMENTS,
  LEGAL_NAV,
  LEGAL_UI,
  LEGAL_VERSION,
} from './uk.js';

const LOCALES = {
  uk: { LEGAL_DOCUMENTS, LEGAL_NAV, LEGAL_UI },
  en: {
    LEGAL_DOCUMENTS,
    LEGAL_NAV: LEGAL_NAV.map((item) => ({
      ...item,
      label: {
        privacy: 'Privacy Policy',
        terms: 'Terms of Use',
        communityGuidelines: 'Community Guidelines',
        deleteAccount: 'Account Deletion',
      }[item.key],
    })),
    LEGAL_UI: {
      brand: LEGAL_UI.brand,
      backHome: 'Back to home',
      versionLabel: 'Version',
      updatedLabel: 'Updated',
      acceptTermsTitle: 'Accept the terms',
      acceptTermsText: 'To continue using LunMeYo, confirm that you have read and agree to the Terms of Use and Privacy Policy.',
      acceptTermsCheckbox: 'I accept the LunMeYo Terms of Use and Privacy Policy',
      acceptTermsTermsLink: 'Terms of Use',
      acceptTermsPrefix: 'I accept the',
      acceptTermsConnector: 'and',
      acceptTermsPrivacyLink: 'Privacy Policy',
      acceptTermsSubmit: 'Continue',
      acceptTermsDecline: 'Decline',
      acceptTermsSubmitting: 'Saving…',
      deleteAccountAction: 'Delete my account',
      deleteAccountConfirm: 'Are you sure? This cannot be undone. Your profile will be anonymized.',
      deleteAccountSuccess: 'Account deleted',
    },
  },
  ru: { LEGAL_DOCUMENTS, LEGAL_NAV, LEGAL_UI },
};

/** @param {string} locale */
export function getLegalLocale(locale) {
  const code = String(locale || 'en').split('-')[0].toLowerCase();
  return LOCALES[code] ?? LOCALES.en;
}

/** @param {string} locale @param {keyof typeof LEGAL_DOCUMENTS} documentKey */
export function getLegalDocument(locale, documentKey) {
  const pack = getLegalLocale(locale);
  return pack.LEGAL_DOCUMENTS[documentKey] ?? null;
}

export function getLegalNav(locale) {
  return getLegalLocale(locale).LEGAL_NAV;
}

export function getLegalUi(locale) {
  return getLegalLocale(locale).LEGAL_UI;
}

export { LEGAL_VERSION };
