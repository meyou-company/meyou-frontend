import { BRAND_NAME } from '../../constants/brand';

export default function BrandWordmark({ className = '', as: Tag = 'span' }) {
  return (
    <Tag className={`app-brand-wordmark ${className}`.trim()}>
      {BRAND_NAME}
    </Tag>
  );
}
