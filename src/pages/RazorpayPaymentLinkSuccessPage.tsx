import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type Status = 'confirming' | 'completed' | 'failed';

export default function RazorpayPaymentLinkSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('confirming');

  useEffect(() => {
    let cancelled = false;

    async function confirmPayment() {
      const paymentId = searchParams.get('razorpay_payment_id');
      const paymentLinkId = searchParams.get('razorpay_payment_link_id');
      const razorpayStatus = searchParams.get('razorpay_payment_status');

      if (!paymentId || !paymentLinkId || razorpayStatus !== 'paid') {
        setStatus('failed');
        window.setTimeout(() => navigate('/user/dashboard', { replace: true }), 1800);
        return;
      }

      try {
        const apiBase = import.meta.env.DEV ? 'http://localhost:5001' : 'https://api.vibenests.in';
        const res = await fetch(`${apiBase}/payments-links-public/payments/link-callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId,
            paymentLinkId,
            status: razorpayStatus,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message || `HTTP ${res.status}`);
        }

        if (!cancelled) setStatus('completed');
      } catch (error) {
        console.warn('Razorpay payment link callback failed:', error);
        if (!cancelled) setStatus('failed');
      } finally {
        if (!cancelled) {
          window.setTimeout(() => navigate('/user/dashboard', { replace: true }), 1800);
        }
      }
    }

    confirmPayment();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center shadow-2xl">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${status === 'failed' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {status === 'failed' ? '!' : '✓'}
        </div>
        <h1 className="text-xl font-semibold">
          {status === 'confirming' ? 'Confirming payment' : status === 'completed' ? 'Payment completed' : 'Payment status needs review'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {status === 'confirming'
            ? 'Please wait while we update your booking status.'
            : status === 'completed'
              ? 'Your booking has been updated. Redirecting to your dashboard...'
              : 'Redirecting to your dashboard...'}
        </p>
      </div>
    </div>
  );
}
