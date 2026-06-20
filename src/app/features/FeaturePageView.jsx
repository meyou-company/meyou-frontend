import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getFeaturePage, getFeatureUi } from '../../i18n/features';

function useFeatureMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMobile;
}

function FeatureCard({ card, comingSoonLabel }) {
  return (
    <article className="featurePage__card">
      <div className="featurePage__cardTop">
        <span className="featurePage__cardEmoji" aria-hidden="true">
          {card.emoji || '✦'}
        </span>
        <div className="featurePage__cardHead">
          <h4 className="featurePage__cardTitle">{card.title}</h4>
          {card.comingSoon ? (
            <span className="featurePage__badge">{comingSoonLabel}</span>
          ) : null}
        </div>
      </div>
      <p className="featurePage__cardText">{card.text}</p>
    </article>
  );
}

function FeatureAccordionItem({ title, text, badge, defaultOpen = false }) {
  return (
    <details className="featurePage__accordionItem" open={defaultOpen ? true : undefined}>
      <summary className="featurePage__accordionSummary">
        <span className="featurePage__accordionTitle">{title}</span>
        {badge ? <span className="featurePage__badge">{badge}</span> : null}
        <span className="featurePage__accordionChevron" aria-hidden="true" />
      </summary>
      <p className="featurePage__accordionBody">{text}</p>
    </details>
  );
}

function FeatureCardsGrid({ cards, comingSoonLabel, swipeHint, variant }) {
  const variantClass = variant ? ` featurePage__cards--${variant}` : '';

  return (
    <div className="featurePage__cardsScroll">
      <p className="featurePage__cardsSwipeHint">{swipeHint}</p>
      <div className={`featurePage__cards${variantClass}`}>
        {cards.map((card) => (
          <FeatureCard key={card.title} card={card} comingSoonLabel={comingSoonLabel} />
        ))}
      </div>
    </div>
  );
}

/**
 * @param {{ pageKey: string }} props
 */
export default function FeaturePageView({ pageKey }) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const page = getFeaturePage(language, pageKey);
  const ui = getFeatureUi(language);
  const isMobile = useFeatureMobile();
  const accordionOpen = !isMobile;

  if (!page) return null;

  const iconStyle = page.icon ? { '--icon-url': `url(${page.icon})` } : undefined;

  return (
    <article key={`${pageKey}-${language}`} className="featurePage">
      <header className="featurePage__hero">
        <div className="featurePage__heroRow">
          <div className="featurePage__iconWrap">
            {page.emoji ? (
              <span className="featurePage__emoji" aria-hidden="true">
                {page.emoji}
              </span>
            ) : (
              <span className="featurePage__icon" style={iconStyle} aria-hidden="true" />
            )}
          </div>
          <h1 className="featurePage__title">{page.title}</h1>
        </div>
        {page.subtitle ? (
          <p className="featurePage__subtitle">{page.subtitle}</p>
        ) : null}
        <p className="featurePage__intro">{page.intro}</p>
      </header>

      {page.cards?.length ? (
        <FeatureCardsGrid
          cards={page.cards}
          comingSoonLabel={ui.comingSoonLabel}
          swipeHint={ui.cardsSwipeHint}
        />
      ) : null}

      {page.comingSoonSection?.items?.length ? (
        <section className="featurePage__comingSoon">
          <h3 className="featurePage__comingSoonTitle">
            {page.comingSoonSection.title || ui.comingSoonSectionTitle}
          </h3>
          <FeatureCardsGrid
            cards={page.comingSoonSection.items.map((item) => ({ ...item, comingSoon: true }))}
            comingSoonLabel={ui.comingSoonLabel}
            swipeHint={ui.cardsSwipeHint}
            variant="soon"
          />
        </section>
      ) : null}

      {page.highlights?.length ? (
        <section className="featurePage__accordionSection">
          <h3 className="featurePage__sectionTitle">{ui.highlightsTitle}</h3>
          <div className="featurePage__accordionList featurePage__highlights">
            {page.highlights.map((item) => (
              <FeatureAccordionItem
                key={item.title}
                title={item.title}
                text={item.text}
                defaultOpen={accordionOpen}
              />
            ))}
          </div>
        </section>
      ) : null}

      {page.blocks?.map((block) => (
        <section key={block.heading} className="featurePage__accordionSection featurePage__block">
          <details className="featurePage__blockGroup" open={accordionOpen || undefined}>
            <summary className="featurePage__blockHeading">{block.heading}</summary>
            <div className="featurePage__accordionList featurePage__blockItems">
              {block.items.map((item) => (
                <FeatureAccordionItem
                  key={item.title}
                  title={item.title}
                  text={item.text}
                  badge={item.comingSoon ? ui.comingSoonLabel : null}
                  defaultOpen={accordionOpen}
                />
              ))}
            </div>
          </details>
        </section>
      ))}

      {page.faq?.length ? (
        <section className="featurePage__accordionSection featurePage__faq">
          <h3 className="featurePage__sectionTitle">{ui.faqTitle}</h3>
          <div className="featurePage__accordionList featurePage__faqList">
            {page.faq.map((item) => (
              <details
                key={item.question}
                className="featurePage__accordionItem featurePage__faqItem"
                open={accordionOpen || undefined}
              >
                <summary className="featurePage__accordionSummary featurePage__faqQuestion">
                  <span className="featurePage__accordionTitle">{item.question}</span>
                  <span className="featurePage__accordionChevron" aria-hidden="true" />
                </summary>
                <p className="featurePage__accordionBody featurePage__faqAnswer">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {page.cta ? (
        <Link
          className={`featurePage__cta${page.cta.path === '/legal/privacy' ? ' featurePage__cta--privacy' : ''}`}
          to={page.cta.path}
        >
          {page.cta.label}
        </Link>
      ) : null}
    </article>
  );
}
