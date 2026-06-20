import { useTranslation } from 'react-i18next';
import { getLegalDocument, getLegalUi } from '../../i18n/legal';

/**
 * @param {{ documentKey: 'privacy' | 'terms' | 'communityGuidelines' | 'deleteAccount' }} props
 */
export default function LegalDocumentView({ documentKey }) {
  const { i18n } = useTranslation();
  const doc = getLegalDocument(i18n.language, documentKey);
  const ui = getLegalUi(i18n.language);

  if (!doc) return null;

  return (
    <article className="legalDoc">
      <h2 className="legalDoc__title">{doc.title}</h2>
      <p className="legalDoc__meta">
        <span>
          {ui.versionLabel}: {doc.version}
        </span>
        <span>
          {ui.updatedLabel}: {doc.updatedAt}
        </span>
      </p>
      {doc.intro ? <p className="legalDoc__intro">{doc.intro}</p> : null}
      {doc.sections.map((section) => (
        <section key={section.heading} className="legalDoc__section">
          <h3 className="legalDoc__heading">{section.heading}</h3>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="legalDoc__paragraph">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
