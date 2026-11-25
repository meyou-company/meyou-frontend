import { BRAND_NAME } from '../../constants/brand';

export default function BrandWordmark({ className = '', as: Component = 'span' }) {
  return (
    <Component className={`app-brand-wordmark ${className}`.trim()}>
      {BRAND_NAME}
    </Component>
  );
}
