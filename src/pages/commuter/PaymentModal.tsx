const SAFARITIX = {
  primary: '#0077B6',
  primaryDark: '#005F8E',
  primarySoft: '#E6F4FB',
};

import { useState, CSSProperties } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CreditCard, Check, Smartphone, Phone, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../components/AuthContext';
import { API_URL } from '../../config';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  scheduleId: string;
  numTickets: number;
  onSuccess: () => void;
  title?: string;
  description?: string;
  busDetails?: {
    route?: string;
    date?: string;
    time?: string;
    company?: string;
  };
}

type PaymentMethod = 'mobile_money' | 'airtel_money' | 'card_payment';

export function PaymentModal({ 
  open, 
  onClose, 
  amount, 
  scheduleId,
  numTickets,
  onSuccess, 
  title, 
  description, 
  busDetails 
}: PaymentModalProps) {
  const { accessToken } = useAuth();
  const [step, setStep] = useState<'method' | 'details' | 'ussd' | 'success'>('method');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  
  // Payment state
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState<string | null>(null);
  const [ussdCode, setUssdCode] = useState<string>('');

  const handleMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setStep('details');
    setError(null);
  };

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    try {
      const phoneOrCard = paymentMethod === 'card_payment' ? cardNumber : phoneNumber;

      if (!phoneOrCard) {
        setError('Please enter phone number or card number');
        setProcessing(false);
        return;
      }

      const response = await fetch(`${API_URL}/payments/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scheduleId,
          paymentMethod,
          phoneOrCard,
          numTickets
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Payment failed');
      }

      setPaymentId(data.payment.id);
      setTransactionRef(data.payment.transaction_ref);

      const ussdCodes = {
        'mobile_money': '*182*1#',
        'airtel_money': '*185*1#',
        'card_payment': ''
      };
      setUssdCode(ussdCodes[paymentMethod] || '');

      if (paymentMethod === 'card_payment') {
        await handleConfirmPayment(true);
      } else {
        setStep('ussd');
      }

    } catch (err: any) {
      setError(err.message || 'Payment failed. Try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmPayment = async (payAnyway: boolean = false) => {
    if (!paymentId) {
      setError('Payment ID missing');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/payments/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentId,
          ussdWorked: !payAnyway
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Confirmation failed');
      }

      await handleBookTicket();

    } catch (err: any) {
      setError(err.message || 'Confirmation failed. Try again.');
      setProcessing(false);
    }
  };

  const handleBookTicket = async () => {
    if (!paymentId) {
      setError('Payment ID missing');
      setProcessing(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/payments/book`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentId,
          numTickets
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Booking failed');
      }

      setStep('success');
      setProcessing(false);

      // Trigger immediate seat map refresh
      if ((window as any).__refreshSeatMap) {
        (window as any).__refreshSeatMap();
      }

      setTimeout(() => {
        onSuccess();
        handleClose();
        // Refresh again after navigation
        if ((window as any).__refreshSeatMap) {
          (window as any).__refreshSeatMap();
        }
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Booking failed. Try again.');
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setStep('method');
    setPaymentMethod('mobile_money');
    setPhoneNumber('');
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardName('');
    setPaymentId(null);
    setTransactionRef(null);
    setUssdCode('');
    setError(null);
    onClose();
  };

  const styles: Record<string, CSSProperties> = {
    // Amount Display
    amountCard: {
      background: `linear-gradient(135deg, ${SAFARITIX.primary} 0%, ${SAFARITIX.primaryDark} 100%)`,
      borderRadius: '16px',
      padding: '24px',
      color: 'white',
      marginBottom: '24px',
      textAlign: 'center' as const,
    },
    amountLabel: {
      fontSize: '14px',
      opacity: 0.9,
      marginBottom: '8px',
    },
    amountValue: {
      fontSize: '42px',
      fontWeight: '700',
      fontFamily: 'Montserrat, sans-serif',
      marginBottom: '4px',
    },
    ticketCount: {
      fontSize: '14px',
      opacity: 0.9,
    },
    // Payment Method Card
    methodCard: {
      background: 'var(--card)',
      border: '2px solid var(--border)',
      borderRadius: '16px',
      padding: '16px',
      marginBottom: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    methodIcon: {
      width: '56px',
      height: '56px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    methodInfo: {
      flex: 1,
    },
    methodTitle: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '2px',
      fontFamily: 'Montserrat, sans-serif',
    },
    methodDesc: {
      fontSize: '13px',
      color: 'var(--muted-foreground)',
    },
    // Error Alert
    errorAlert: {
      background: '#FEE2E2',
      border: '1px solid #E63946',
      color: '#991B1B',
      padding: '12px 16px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '16px',
      fontSize: '14px',
    },
    // USSD Display
    ussdContainer: {
      background: 'rgba(255, 255, 255, 0.15)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '16px',
    },
    ussdCode: {
      background: 'rgba(255, 255, 255, 0.25)',
      padding: '16px',
      borderRadius: '12px',
      fontFamily: 'monospace',
      fontSize: '28px',
      fontWeight: '700',
      textAlign: 'center' as const,
      marginBottom: '12px',
      letterSpacing: '2px',
    },
    ussdInstructions: {
      fontSize: '13px',
      opacity: 0.95,
      textAlign: 'center' as const,
    },
    // Success
    successContainer: {
      textAlign: 'center' as const,
      padding: '40px 20px',
    },
    successIcon: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: '#27AE60',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 24px',
      animation: 'bounce 0.6s ease-in-out',
    },
    successTitle: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#27AE60',
      marginBottom: '8px',
      fontFamily: 'Montserrat, sans-serif',
    },
    successText: {
      fontSize: '14px',
      color: 'var(--muted-foreground)',
      marginBottom: '24px',
    },
    // Details Card
    detailsCard: {
      background: '#F9FAFB',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
    },
    detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      fontSize: '14px',
    },
    detailLabel: {
      color: 'var(--muted-foreground)',
    },
    detailValue: {
      fontWeight: '600',
    },
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent style={{ maxWidth: '500px', padding: '24px' }}>
        {/* STEP 1: Choose Method */}
        {step === 'method' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px', fontFamily: 'Montserrat, sans-serif' }}>
                {title || 'Choose Payment Method'}
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>
                {description || 'Select how you want to pay'}
              </p>
            </div>

            <div style={styles.amountCard}>
              <div style={styles.amountLabel}>Amount to Pay</div>
              <div style={styles.amountValue}>RWF {amount.toLocaleString()}</div>
              {numTickets > 0 && (
                <div style={styles.ticketCount}>
                  {numTickets} ticket{numTickets > 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div>
              {/* MTN MoMo */}
              <div
                style={styles.methodCard}
                onClick={() => handleMethodSelect('mobile_money')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = SAFARITIX.primary;
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,119,182,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ ...styles.methodIcon, background: '#FFCB05', color: '#000' }}>
                  <Phone style={{ width: '28px', height: '28px' }} />
                </div>
                <div style={styles.methodInfo}>
                  <div style={styles.methodTitle}>MTN Mobile Money</div>
                  <div style={styles.methodDesc}>Pay with MTN MoMo</div>
                </div>
                <div style={{
                  background: '#27AE60',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}>
                  Popular
                </div>
              </div>

              {/* Airtel Money */}
              <div
                style={styles.methodCard}
                onClick={() => handleMethodSelect('airtel_money')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = SAFARITIX.primary;
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,119,182,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ ...styles.methodIcon, background: '#E63946', color: 'white' }}>
                  <Smartphone style={{ width: '28px', height: '28px' }} />
                </div>
                <div style={styles.methodInfo}>
                  <div style={styles.methodTitle}>Airtel Money</div>
                  <div style={styles.methodDesc}>Pay with Airtel Money</div>
                </div>
              </div>

              {/* Card Payment */}
              <div
                style={styles.methodCard}
                onClick={() => handleMethodSelect('card_payment')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = SAFARITIX.primary;
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,119,182,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ ...styles.methodIcon, background: SAFARITIX.primary, color: 'white' }}>
                  <CreditCard style={{ width: '28px', height: '28px' }} />
                </div>
                <div style={styles.methodInfo}>
                  <div style={styles.methodTitle}>Card Payment</div>
                  <div style={styles.methodDesc}>Debit or Credit Card</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: Enter Details (Mobile Money) */}
        {step === 'details' && paymentMethod !== 'card_payment' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px', fontFamily: 'Montserrat, sans-serif' }}>
                {paymentMethod === 'mobile_money' ? 'MTN Mobile Money' : 'Airtel Money'}
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>
                Enter your phone number
              </p>
            </div>

            {error && (
              <div style={styles.errorAlert}>
                <AlertCircle style={{ width: '16px', height: '16px' }} />
                <span>{error}</span>
              </div>
            )}

            <div style={{
              ...styles.detailsCard,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: paymentMethod === 'mobile_money' ? '#FFCB05' : '#E63946',
                color: paymentMethod === 'mobile_money' ? '#000' : 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {paymentMethod === 'mobile_money' ? 
                  <Phone style={{ width: '24px', height: '24px' }} /> : 
                  <Smartphone style={{ width: '24px', height: '24px' }} />
                }
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Amount</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: SAFARITIX.primary, fontFamily: 'Montserrat, sans-serif' }}>
                  RWF {amount.toLocaleString()}
                </div>
              </div>
            </div>

            <form onSubmit={handleInitiatePayment}>
              <div style={{ marginBottom: '20px' }}>
                <Label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                  Phone Number
                </Label>
                <Input
                  type="tel"
                  placeholder="078XXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  maxLength={10}
                  style={{ fontSize: '16px', padding: '12px' }}
                />
                <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '6px' }}>
                  You'll get a prompt on your phone
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('method')}
                  disabled={processing}
                  style={{ flex: 1, padding: '12px' }}
                >
                  <ArrowLeft style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={processing}
                  style={{
                    flex: 1,
                    background: SAFARITIX.primary,
                    color: 'white',
                    fontWeight: '600',
                    padding: '12px',
                  }}
                >
                  {processing ? (
                    <>
                      <Loader2 style={{ width: '16px', height: '16px', marginRight: '8px' }} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay RWF ${amount.toLocaleString()}`
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* STEP 2: Enter Details (Card) */}
        {step === 'details' && paymentMethod === 'card_payment' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px', fontFamily: 'Montserrat, sans-serif' }}>
                Card Payment
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>
                Enter your card details
              </p>
            </div>

            {error && (
              <div style={styles.errorAlert}>
                <AlertCircle style={{ width: '16px', height: '16px' }} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ ...styles.amountCard, marginBottom: '20px', padding: '16px' }}>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>Amount</div>
              <div style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'Montserrat, sans-serif' }}>
                RWF {amount.toLocaleString()}
              </div>
            </div>

            <form onSubmit={handleInitiatePayment}>
              <div style={{ marginBottom: '16px' }}>
                <Label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>
                  Cardholder Name
                </Label>
                <Input
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <Label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>
                  Card Number
                </Label>
                <Input
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  maxLength={19}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <Label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>
                    Expiry
                  </Label>
                  <Input
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    maxLength={5}
                    required
                  />
                </div>
                <div>
                  <Label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>
                    CVV
                  </Label>
                  <Input
                    type="password"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    maxLength={3}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('method')}
                  disabled={processing}
                  style={{ flex: 1 }}
                >
                  <ArrowLeft style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={processing}
                  style={{
                    flex: 1,
                    background: SAFARITIX.primary,
                    color: 'white',
                    fontWeight: '600',
                  }}
                >
                  {processing ? (
                    <>
                      <Loader2 style={{ width: '16px', height: '16px', marginRight: '8px' }} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay RWF ${amount.toLocaleString()}`
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* STEP 3: USSD Confirmation */}
        {step === 'ussd' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px', fontFamily: 'Montserrat, sans-serif' }}>
                Complete Payment
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>
                Follow instructions to confirm
              </p>
            </div>

            {error && (
              <div style={styles.errorAlert}>
                <AlertCircle style={{ width: '16px', height: '16px' }} />
                <span>{error}</span>
              </div>
            )}

            <div style={styles.amountCard}>
              <div style={styles.amountLabel}>Amount to Pay</div>
              <div style={styles.amountValue}>RWF {amount.toLocaleString()}</div>
              
              <div style={styles.ussdContainer}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📱 Dial this code:
                </div>
                <div style={styles.ussdCode}>{ussdCode}</div>
                <div style={styles.ussdInstructions}>
                  Enter your PIN when prompted
                </div>
              </div>
            </div>

            <div style={styles.detailsCard}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Transaction Ref</span>
                <span style={{ ...styles.detailValue, fontFamily: 'monospace', fontSize: '12px' }}>
                  {transactionRef}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Method</span>
                <span style={styles.detailValue}>
                  {paymentMethod === 'mobile_money' ? 'MTN MoMo' : 'Airtel Money'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button
                onClick={() => handleConfirmPayment(false)}
                disabled={processing}
                style={{
                  width: '100%',
                  background: '#27AE60',
                  color: 'white',
                  fontWeight: '600',
                  padding: '14px',
                }}
              >
                {processing ? (
                  <>
                    <Loader2 style={{ width: '16px', height: '16px', marginRight: '8px' }} className="animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <Check style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                    I've Paid - Confirm
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => handleConfirmPayment(true)}
                variant="outline"
                disabled={processing}
                style={{ width: '100%', padding: '14px' }}
              >
                Pay Anyway
              </Button>
            </div>
          </>
        )}

        {/* STEP 4: Success */}
        {step === 'success' && (
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>
              <Check style={{ width: '40px', height: '40px' }} />
            </div>
            <h3 style={styles.successTitle}>Payment Success! 🎉</h3>
            <p style={styles.successText}>
              Your ticket has been booked
            </p>

            <div style={styles.detailsCard}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Paid</span>
                <span style={{ ...styles.detailValue, color: '#27AE60', fontSize: '16px' }}>
                  RWF {amount.toLocaleString()}
                </span>
              </div>
              {transactionRef && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Ref</span>
                  <span style={{ ...styles.detailValue, fontFamily: 'monospace', fontSize: '12px' }}>
                    {transactionRef}
                  </span>
                </div>
              )}
              {busDetails?.route && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Route</span>
                  <span style={styles.detailValue}>{busDetails.route}</span>
                </div>
              )}
              {busDetails?.date && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Date</span>
                  <span style={styles.detailValue}>{busDetails.date}</span>
                </div>
              )}
              {busDetails?.time && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Time</span>
                  <span style={styles.detailValue}>{busDetails.time}</span>
                </div>
              )}
            </div>

            <div style={{
              background: '#DCFCE7',
              border: '1px solid #27AE60',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '13px',
              color: '#166534',
              marginTop: '16px',
            }}>
              ✓ Payment confirmed<br />
              ✓ Ticket booked<br />
              ✓ Redirecting...
            </div>
          </div>
        )}

        <style>
          {`
            @keyframes bounce {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
            }
          `}
        </style>
      </DialogContent>
    </Dialog>
  );
}
