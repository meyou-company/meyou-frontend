import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MediaViewerModal from './MediaViewerModal.jsx';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

describe('MediaViewerModal protected media errors', () => {
  it('forwards image onError to onMediaError callback', () => {
    const onMediaError = vi.fn();
    render(
      <MediaViewerModal
        isOpen
        onClose={vi.fn()}
        media={{
          type: 'image',
          url: 'https://cdn/expired.jpg',
          onMediaError,
        }}
      />,
    );

    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(onMediaError).toHaveBeenCalledTimes(1);
  });
});