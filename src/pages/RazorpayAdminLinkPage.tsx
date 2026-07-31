import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { loadRazorpayCheckoutScript } from '@/lib/razorpay';

type Status = 'loading' | 'ready' | 'success' | 'failed' | 'error';

export default function RazorpayAdminLinkPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();

  const bookingId = useMemo(() => {
    const v = searchParams.get('bookingId');
    return v ? Number(v) : null;
  }, [searchParams]);

  const paymentId = useMemo(() => {
    const v = searchParams.get('paymentId');
    return v ? Number(v) : null;
  }, [searchParams]);

  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!orderId || !bookingId || !paymentId) {
      setStatus('error');
      setErrorMsg('Invalid payment link. Missing parameters.');
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        setStatus('loading');
        setErrorMsg('');

        await loadRazorpayCheckoutScript();
        if (cancelled) return;

        const apiBase = import.meta.env.DEV ? 'http://localhost:5001' : 'https://api.vibenests.in';

        const res = await fetch(`${apiBase}/payments-links-public/payments/create-order-for-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, paymentId, orderId }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message || `HTTP ${res.status}`);
        }

        const payload = await res.json();
        if (cancelled) return;

        const { keyId, amount, currency, razorpayOrderId } = payload;

        if (!keyId || !razorpayOrderId) {
          throw new Error('Backend did not return Razorpay checkout options.');
        }

        const options: any = {
          key: keyId,
          amount: Math.round(Number(amount) * 100),
          currency: currency || 'INR',
          name: 'VibeNests',
          description: `Booking VN${bookingId}`,
          order_id: razorpayOrderId,
          handler: async function () {
            // In this MVP version, we don't call /payments/verify-payment from the client.
            // Booking confirmation happens asynchronously via Razorpay webhook.
            if (cancelled) return;
            setStatus('success');
          },
          modal: {
            ondismiss: function () {
              // If user closes checkout, keep booking pending.
            },
          },
        };

        setStatus('ready');
        const rzp = (window as any).Razorpay(options);
        rzp.open();
      } catch (e: any) {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(e?.message || 'Failed to initialize Razorpay checkout');
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [orderId, bookingId, paymentId]);

  useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(() => navigate('/user/dashboard', { replace: true }), 1500);
      return () => clearTimeout(t);
    }
  }, [status, navigate]);

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h2>VibeNests Payment</h2>
      {status === 'loading' && <p>Please wait…</p>}
      {status === 'ready' && <p>Opening Razorpay checkout…</p>}
      {status === 'success' && <p>Payment received. Booking will be confirmed shortly.</p>}

      {(status === 'failed' || status === 'error') && (
        <div>
          <p style={{ color: 'crimson' }}>Something went wrong.</p>
          {errorMsg && <p>{errorMsg}</p>}
        </div>
      )}

      <p style={{ marginTop: 18, color: '#666', fontSize: 12 }}>
        Closing this page won’t cancel the payment. Final status updates are handled via Razorpay webhook.
      </p>
    </div>
  );
}

