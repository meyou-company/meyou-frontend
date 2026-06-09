# MeYou i18n

Shared translation bundles for **React Web** and future **React Native / Expo**.

## Structure

```
locales/
  uk.json   # nested keys: common.save, messenger.title, errors.VIDEO_TOO_LONG
  en.json
  ...
```

## Usage (web)

```jsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
t('messenger.title');
t('errors.VIDEO_TOO_LONG');
t('messenger.newMessageFrom', { name: 'Anna' });
```

## Mobile (Expo)

Copy the `locales/` folder into the mobile app and initialize `i18next` with the same JSON files and `keySeparator: '.'`.

## Locale codes

`uk`, `en`, `tr`, `fr`, `cs`, `es`, `ru`, `ar` — RTL is enabled for `ar` only.
