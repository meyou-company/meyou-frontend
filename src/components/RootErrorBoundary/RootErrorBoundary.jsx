import { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { captureReactError } from '../../monitoring/sentry.js';
import './RootErrorBoundary.scss';

class RootErrorBoundaryInner extends Component {
  state = {
    hasError: false,
    eventId: null,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    const eventId = captureReactError(error, info?.componentStack);
    this.setState({ eventId: eventId ?? null });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError } = this.state;
    const { children, t } = this.props;
    if (!hasError) return children;

    return (
      <div className="root-error-boundary" role="alert">
        <div className="root-error-boundary__card">
          <h1 className="root-error-boundary__title">
            {t('monitoring.crashTitle')}
          </h1>
          <p className="root-error-boundary__text">{t('monitoring.crashBody')}</p>
          {this.state.eventId ? (
            <p className="root-error-boundary__ref" aria-live="polite">
              {t('monitoring.reference', { id: this.state.eventId })}
            </p>
          ) : null}
          <button
            type="button"
            className="root-error-boundary__button"
            onClick={this.handleReload}
          >
            {t('monitoring.reload')}
          </button>
        </div>
      </div>
    );
  }
}

export default withTranslation()(RootErrorBoundaryInner);