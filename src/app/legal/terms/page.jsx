import LegalLayout from '../layout';
import LegalDocumentView from '../LegalDocumentView';

export default function LegalTermsPage() {
  return (
    <LegalLayout>
      <LegalDocumentView documentKey="terms" />
    </LegalLayout>
  );
}
