import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getFeaturePage, getFeatureUi } from '../../i18n/features';

function FeatureCard({ card, comingSoonLabel }) {
  return (
    <article className="featurePage__card">
      <span className="featurePage__cardEmoji" aria-hidden="true">
        {card.emoji || '✦'}
      </span>
      <div className="featurePage__cardBody">
        <div className="featurePage__cardHead">
          <h4 className="featurePage__cardTitle">{card.title}</h4>
          {card.comingSoon ? (
            <span className="featurePage__badge">{comingSoonLabel}</span>
          ) : null}
        </div>
        <p className="featurePage__cardText">{card.text}</p>
      </div>
    </article>
  );
}

/**
 * @param {{ pageKey: string }} props
 */
export default function FeaturePageView({ pageKey }) {
  const { i18n } = useTranslation();
  const page = getFeaturePage(i18n.language, pageKey);
  const ui = getFeatureUi(i18n.language);

  if (!page) return null;

  const iconStyle = page.icon
    ? { '--icon-url': `url(${page.icon})` }
    : undefined;

  return (
    <article className="featurePage">
      <header className="featurePage__hero">
        <div className="featurePage__iconWrap">
          {page.emoji ? (
            <span className="featurePage__emoji" aria-hidden="true">
              {page.emoji}
            </span>
          ) : (
            <span
              className="featurePage__icon"
              style={iconStyle}
              aria-hidden="true"
            />
          )}
        </div>
        <h2 className="featurePage__title">{page.title}</h2>
        <p className="featurePage__subtitle">{page.subtitle}</p>
        <p className="featurePage__intro">{page.intro}</p>
      </header>

      {page.cards?.length ? (
        <div className="featurePage__cards">
          {page.cards.map((card) => (
            <FeatureCard
              key={card.title}
              card={card}
              comingSoonLabel={ui.comingSoonLabel}
            />
          ))}
        </div>
      ) : null}

      {page.comingSoonSection?.items?.length ? (
        <section className="featurePage__comingSoon">
          <h3 className="featurePage__comingSoonTitle">
            {page.comingSoonSection.title || ui.comingSoonSectionTitle}
          </h3>
          <div className="featurePage__cards featurePage__cards--soon">
            {page.comingSoonSection.items.map((item) => (
              <FeatureCard
                key={item.title}
                card={{ ...item, comingSoon: true }}
                comingSoonLabel={ui.comingSoonLabel}
              />
            ))}
          </div>
        </section>
      ) : null}

      {page.highlights?.length ? (
        <>
          <h3 className="featurePage__highlightsTitle">{ui.highlightsTitle}</h3>
          <div className="featurePage__highlights">
            {page.highlights.map((item) => (
              <div key={item.title} className="featurePage__highlightCard">
                <h4 className="featurePage__highlightTitle">{item.title}</h4>
                <p className="featurePage__highlightText">{item.text}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {page.blocks?.map((block) => (
        <section key={block.heading} className="featurePage__block">
          <h3 className="featurePage__blockHeading">{block.heading}</h3>
          <div className="featurePage__blockItems">
            {block.items.map((item) => (
              <div key={item.title} className="featurePage__blockItem">
                <div className="featurePage__blockItemHead">
                  <h4 className="featurePage__blockItemTitle">{item.title}</h4>
                  {item.comingSoon ? (
                    <span className="featurePage__badge">{ui.comingSoonLabel}</span>
                  ) : null}
                </div>
                <p className="featurePage__blockItemText">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {page.faq?.length ? (
        <section className="featurePage__faq">
          <h3 className="featurePage__faqTitle">{ui.faqTitle}</h3>
          <div className="featurePage__faqList">
            {page.faq.map((item) => (
              <details key={item.question} className="featurePage__faqItem">
                <summary className="featurePage__faqQuestion">{item.question}</summary>
                <p className="featurePage__faqAnswer">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {page.cta ? (
        <Link className="featurePage__cta" to={page.cta.path}>
          {page.cta.label}
        </Link>
      ) : null}
    </article>
  );
}
